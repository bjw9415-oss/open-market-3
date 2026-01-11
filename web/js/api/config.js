// 1. 인증 헤더 자동 생성 (getAuthHeaders)
// 명세서에서 자물쇠 아이콘이 있는 보안 API를 호출할 때 가장 중요.

// localStorage에서 access_token을 매번 수동으로 꺼내올 필요가 없게 된다.

// 함수 하나로 "Authorization": "Bearer {token}" 형식을 만들어주어 코드가 깔끔.

// 2. 로그인 상태 통합 관리 (isLoggedIn, getUser)
// 여러 페이지에서 사용자의 상태를 확인할 때 기준을 하나로 통일.

// isLoggedIn(): 토큰 존재 여부를 확인해 장바구니 담기나 주문 가능 여부를 판단.

// getUser(): 저장된 사용자 정보(구매자/판매자 구분 등)를 객체 형태로 안전하게 가져오기.

// 3. 데이터 포맷팅 (formatNumber)
// 사용자에게 보여줄 데이터를 보기 좋게 가공.

// 숫자 데이터를 17,500원처럼 세 자리마다 콤마(,)를 찍어주는 기능을 모든 페이지에서 공통으로 사용합니다.

// 재발급 로직이 포함된 공통 함수

const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api" // 로컬 개발
    : "https://open-market-jade.vercel.app/api"; //배포 url
const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
};

export const PAGES = {
  HOME: "index.html",
  SIGNIN: "signin.html",
  SIGNUP: "signup.html",
  CART: "cart.html",
  ORDER: "order.html",
  DETAIL: "detail.html",
  ERROR: "404.html",
};

export const Utils = {
  getUser() {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  isLoggedIn() {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  // fetchWithAuth를 Utils 안에 추가하여 관리
  /* 기존 getAuthHeaders 는 단순히 로컬 스토리지에 있는 토큰을 가져와서 
     헤더를 만드는 역할만 했지만, fetchWithAuth는 내부적으로 헤더를 만들 뿐만 아니라 
     실제로 API 요청을 보내고, 401 에러가 발생했을 때(토큰이 만료 되었을때) 
     토큰 재발급과 재시도 로직까지 포함.
  */
  async fetchWithAuth(endpoint, options = {}) {
    //  URL 구성, 주소가 http로 시작하면 그대로, 아니면 기본 API_URL과 결합
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    // 로컬 스토리지에서 액세스 토큰 가져오기
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    // 기본 헤더 설정-> JSON 형식을 기본으로 하고, 토큰이 있으면 Authorization 헤더를 추가
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };

    try {
      //실제로 서버에 요청 보내기
      let response = await fetch(url, { ...options, headers });

      // 401 에러 시 토큰 재발급 로직
      // 응답 코드가 401이면 토큰이 만료 되었다는 것이니까 재발급을 위해 저장해둔 리프레쉬 토큰을 꺼냄
      if (response.status === 401) {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        // 만약 리프레쉬 토큰이 없으면 더 이상 진행 못하니까 에러 던짐
        if (!refreshToken) throw new Error("No refresh token");
        // 서버의 토큰 재발급 엔드포인트에 리프레시 토큰을 실어 보내기
        const refreshResponse = await fetch(
          `${API_URL}/accounts/token/refresh/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          }
        );
        // 재발급이 성공 했을때
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          //서버가 준 액세스 토큰을 로컬 스토리지에 다시 저장
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);

          // 새 토큰으로 헤더에 갈아 끼우고, 처음에 하려던 요청을 똑같이 다시 보냄
          return await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.access}`, //새로 받은 토큰 적용
            },
          });
        } else {
          // 리프레시 실패 시 로그아웃 처리
          this.logout(); // 아래 logout 함수 활용
        }
      }
      if (!response.ok) {
        let message = "서버 요청에 실패했습니다.";
        try {
          const errorData = await response.json();
          // 서버 응답의 detail 또는 message 필드에서 에러 문구 추출
          message = errorData.detail || errorData.message || message;
        } catch (e) {
          /* JSON 파싱 실패 시 기본 메시지 유지 */
        }
        // 에러를 던져 호출한 곳의 catch 블록에서 잡히게 함
        throw new Error(message);
      }
      //모든 과정이 정상이라면, 재시도한 결과 응담을 반환
      return response;
    } catch (error) {
      // 예상치 못한 에러를 콘솔에 찍어주고 밖으로 던져줌
      console.error("Fetch 에러:", error);
      throw error;
    }
  },
  logout() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.clear();
    window.location.href = PAGES.SIGNIN;
  },
};
