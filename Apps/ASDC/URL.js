import { setSelectedDataIDs, setPublicTask } from "./State.js";

export const findAssetAndDataFromUrl = () => {
  var currentUrl = window.location.href.split('?')[0];
  if (currentUrl[currentUrl.length - 1] === "/")
    currentUrl = currentUrl.slice(0, currentUrl.length - 1);

  var match = currentUrl.match(".*/([^/]+)");
  if (
    match[1].toUpperCase() !== "ASDC" &&
    match[1].toLowerCase() != "asdc.html"
  ) {
    setSelectedDataIDs(match[1].split("&").map((id) => id));
  }

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const task = urlParams.get('task');
  setPublicTask(task);
};
