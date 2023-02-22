export const cesiumIonAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZkNGFlZS1iNzVhLTRmNTAtOThmYi1kMTI1MjlmOTVlNjciLCJpZCI6NzIyNTQsImlhdCI6MTYzNTkwNDI4OX0.EXVvJZa8yaugMmQNkc9pjWfrjqeOpZ8Jg7_0Hdwnb1A";

// export const baseURL =  "https://dev.asdc.cloud.edu.au";
// export const baseURL =  "https://asdc.cloud.edu.au";
export const baseURL =
  window.location.hostname == "localhost"
    ? "https://dev.asdc.cloud.edu.au"
    : `${window.location.protocol}//${window.location.host
        .split(".")
        .slice(
          window.location.host.split(".").length == 6
            ? window.location.host.split(".").length - 5
            : window.location.host.split(".").length == 5
            ? window.location.host.split(".").length - 4
            : 0
        )
        .join(".")}`;

// export const eptServer = "http://localhost:3000";
// export const eptServer = "http://192.168.99.100:3000";
// export const eptServer = "https://asdc.cloud.edu.au/ept";
export const eptServer = `${baseURL}/ept`;
// export const eptServer = `https://ept.asdc.cloud.edu.au`; //Cookies need to get passed to subdomain
var url = new URL(baseURL);
// export const eptServer = `${url.protocol}//ept.${url.host}`;

export const pcFormats = ["laz", "las", "xyz", "pcd", "ply"];

// export const processingAPI="http://localhost:8081";
// export const processingAPI="http://192.168.99.100:8081";
// export const processingAPI = "https://asdc.cloud.edu.au/cesium-api";
export const processingAPI = `${baseURL}/cesium-api`;
// export const processingAPI = `https://cesium-api.asdc.cloud.edu.au`; //Cookies need to get passed to subdomain
// export const processingAPI = `${url.protocol}//cesium-api.${url.host}`;

export const highlightHeightPX = 27.2;
export const highlightColor = "green";
