import { selectedDataIDs, setSelectedDataIDs } from "./State.js";

export const findAssetAndDataFromUrl = () => {
  var currentUrl = window.location.href;
  if (currentUrl[currentUrl.length - 1] === "/")
    currentUrl = currentUrl.slice(0, currentUrl.length - 1);

  var match = currentUrl.match(".*/([^/]+)");
  if (
    match[1].toUpperCase() !== "ASDC" &&
    match[1].toLowerCase() != "asdc.html"
  ) {
    setSelectedDataIDs(match[1].split("&").map((id) => parseInt(id)));
  }
};
