import { selectedAssetID, setSelectedAssetID, setSelectedDataIndex } from "./State.js";

export const findAssetAndDataFromUrl = () => {
    var currentUrl = window.location.href;
    if (currentUrl[currentUrl.length - 1] === "/")
        currentUrl = currentUrl.slice(0, currentUrl.length - 1);
    
    var match = currentUrl.match(".*\/([^\/]+)\/([^\/]+)");
    if (
        match[1].toUpperCase() !== "ASDC" &&
        match[1].toLowerCase() != "asdc.html"
    ) {
        setSelectedAssetID(match[1]);
        setSelectedDataIndex(match[2]);
    } else {
        setSelectedAssetID(match[2]);
    }
}

export const checkAssetStrings = () => {
    
    if (selectedAssetID.toLowerCase() === "nue") setSelectedAssetID(1);
    else if (selectedAssetID.toLowerCase() === "vbir") setSelectedAssetID(2);
    else if (selectedAssetID.toLowerCase() === "usln") setSelectedAssetID(3);
    else if (selectedAssetID.toLowerCase() === "gillan_ecosphere")
        setSelectedAssetID(4);
    else if (selectedAssetID.toLowerCase() === "dryandra_model")
        setSelectedAssetID(5);
    else if (selectedAssetID.toLowerCase() === "dryandra_pointcloud")
        setSelectedAssetID(6);
    else if (selectedAssetID.toLowerCase() === "graffiti_model")
        setSelectedAssetID(7);
    else if (selectedAssetID.toLowerCase() === "graffiti_pointcloud")
        setSelectedAssetID(8);
}