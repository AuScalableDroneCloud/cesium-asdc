export var viewer;

export var assets = [];
export var datasets = [];
export var categories = [];

export var odmProjects;
export var publicTask;

export var selectedDataIDs = []; //url data ids

export var selectedData; //cam
export var selectedDatasets = [];

export var selectedAssetIDs = [];

export var tilesets = {};
export var entities = {};
export var dataSources = {};
export var imageryLayers = {};

export var controllers = {};
export var lastCurrentTime;

export var sourceDivs = {};
export var assetDivs = {};
export var projectDivs = {};
export var categoryDivs = {};
export var sharedDivs = {};

export var initVars = {}; //index file init variables
export var init;  //url index query parameter used for sharing

export var taskInfos;

export var selectedDimension;
export var billboard = false;

export var MSSE = 83;

export var markersDataSource;

export const pinBuilder = new Cesium.PinBuilder();

export const timelineTracks = {};

export var zoomOnDataSelect = true;
export var timelineOnDataSelect = true;

export var loadingFinished = false;

export var indexFile =
  "https://appf-anu.s3.ap-southeast-2.amazonaws.com/Cesium/index.json";
  // "/cesium/Apps/ASDC/index.json";

export var mousePosition={}

export function setViewer(newViewer) {
  viewer = newViewer;
}

export function setAssets(newAssets) {
  assets = newAssets;
}

export function setDatasets(newDatasets) {
  datasets = newDatasets;
}

export function setCategories(newCategories) {
  categories = newCategories;
}

export function setODMProjects(newODMProjects){
  odmProjects = newODMProjects;
}

export function setPublicTask(newPublicTask){
  publicTask = newPublicTask;
}

export function setSelectedData(newData) {
  selectedData = newData;
}

export function setSelectedDatasets(newDatasets) {
  selectedDatasets = newDatasets;
}

export function setSelectedDataIDs(newDataIDs) {
  selectedDataIDs = newDataIDs;
}

export function setSelectedAssetIDs(newAssetIDs) {
  selectedAssetIDs = newAssetIDs;
}

export function setSelectedDimension(newDimension) {
  selectedDimension = newDimension;
}

export function setMSSE(newMSSE) {
  MSSE = newMSSE;
}

export function setMarkersDataSource(newMarkersDataSource) {
  markersDataSource = newMarkersDataSource;
}

export function setAlpha(newAlpha) {
  alpha = newAlpha;
}

export function setLastCurrentTime(newCurrentTime) {
  lastCurrentTime = newCurrentTime;
}

export function setBillboard(newBillboard) {
  billboard = newBillboard;
}

export function setTaskInfos(newTaskInfos){
  taskInfos = newTaskInfos;
}

export function setIndexFile(newIndexFile){
  indexFile = newIndexFile;
}

export function setInitVars(newInitVars){
  initVars = newInitVars;
}

export function setZoomOnDataSelect(newZoomOnDataSelect) {
  zoomOnDataSelect=newZoomOnDataSelect;
}
export function setTimelineOnDataSelect(newTimelineOnDataSelect) {
  timelineOnDataSelect=newTimelineOnDataSelect;
}

export function setLoadingFinshed(newLoadingFinished) {
  loadingFinished=newLoadingFinished;
}

export function setInit(newInit) {
  init=newInit;
}