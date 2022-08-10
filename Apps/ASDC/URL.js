import { setSelectedDataIDs, setPublicTask, setIndexFile,setInit,init, setBillboard,setSelectedDimension,setZoomOnDataSelect,setMSSE, MSSE, setTimelineOnDataSelect } from "./State.js";

export const readUrlParams = () => {
  var currentUrl = window.location.href.split('?')[0];
  if (currentUrl[currentUrl.length - 1] === "/")
    currentUrl = currentUrl.slice(0, currentUrl.length - 1);

  var match = currentUrl.match(".*/([^/]+)");
  if (
    match[1].toUpperCase() !== "ASDC" &&
    match[1].toLowerCase() != "asdc.html"
  ) {
    setSelectedDataIDs(match[1].split("#")[0].split("&").map((id) => id));
  }

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const task = urlParams.get('task');
  setPublicTask(task);
  const indexFile = urlParams.get('index');
  if (indexFile){
    setIndexFile(indexFile);
  }

  const initParam = window.location.hash;
  if(initParam){
    setInit(JSON.parse(decodeURIComponent(initParam.slice(6))));
    
    if (init.billboard!=undefined){
      setBillboard(init.billboard);
      document.getElementById("image-series-toolbar").childNodes[0].selectedIndex = 1;
    }
    if (init.selectedDimension!=undefined){
      setSelectedDimension(init.selectedDimension);
    }
    if (init.zoomOnDataSelect!=undefined){
      setZoomOnDataSelect(init.zoomOnDataSelect);
      document.getElementById("zoom-checkbox").checked = init.zoomOnDataSelect;
    }
    if (init.timelineOnDataSelect!=undefined){
      setTimelineOnDataSelect(init.timelineOnDataSelect);
      document.getElementById("timeline-checkbox").checked = init.timelineOnDataSelect;
    }
    if(init.MSSE!=undefined){
      setMSSE(parseInt(init.MSSE));
      document.getElementById("msse-slider").value = parseInt(init.MSSE);
      document.getElementById("msse-value").innerHTML = MSSE + " %";
    }
  }
};
