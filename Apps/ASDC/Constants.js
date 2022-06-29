export const cesiumIonAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZkNGFlZS1iNzVhLTRmNTAtOThmYi1kMTI1MjlmOTVlNjciLCJpZCI6NzIyNTQsImlhdCI6MTYzNTkwNDI4OX0.EXVvJZa8yaugMmQNkc9pjWfrjqeOpZ8Jg7_0Hdwnb1A";
  
// export const baseURL =  "https://dev.asdc.cloud.edu.au";
// export const baseURL =  "https://asdc.cloud.edu.au";
export const baseURL = window.location.hostname=="localhost" ? "https://asdc.cloud.edu.au" : window.location.origin; 

// export const eptServer = "http://localhost:3000";
// export const eptServer = "http://192.168.99.100:3000";
// export const eptServer = "https://asdc.cloud.edu.au/ept";
export const eptServer = `${baseURL}/ept`;

export const pcFormats = ["laz", "las", "xyz", "pcd", "ply"];

// export const processingAPI="http://localhost:8081";
// export const processingAPI="http://192.168.99.100:8081";
// export const processingAPI = "https://asdc.cloud.edu.au/cesium-api";
export const processingAPI = `${baseURL}/cesium-api`;

export const highlightHeightPX = 27.2;
export const highlightColor = "green";
