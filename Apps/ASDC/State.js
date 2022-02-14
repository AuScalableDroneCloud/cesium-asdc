export var viewer;

export var assets;

export var selectedAsset;
export var selectedData;
export var selectedAssetID;
export var selectedDataIndex;

export var tilesets = {};
export var entities = {};
export var dataSources = {};

export var selectedTileset;
export var selectedDimension;

export var MSSE=32;

export var markersDataSource;

export const pinBuilder = new Cesium.PinBuilder();

export function setViewer(newViewer){
    viewer=newViewer;
}

export function setAssets(newAssets){
    assets = newAssets;
}

export function setSelectedAsset(newAsset){
    selectedAsset=newAsset;
}

export function setSelectedData(newData){
    selectedData=newData;
}

export function setSelectedAssetID(newAssetID){
    selectedAssetID = newAssetID;
}

export function setSelectedDataIndex(newDataIndex){
    selectedDataIndex = newDataIndex;
}

export function setSelectedTileset(newTileset){
    selectedTileset=newTileset;
}

export function setSelectedDimension(newDimension){
    selectedDimension=newDimension;
}

export function setMSSE(newMSSE){
    MSSE=newMSSE;
}

export function setMarkersDataSource(newMarkersDataSource){
    markersDataSource = newMarkersDataSource;
}