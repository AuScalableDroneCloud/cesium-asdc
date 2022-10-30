import {
  baseURL,
  cesiumIonAccessToken,
  eptServer,
  processingAPI,
} from "./Constants.js";
import {
  viewer,
  setViewer,
  tilesets,
  entities,
  selectedAssetIDs,
  selectedData,
  setSelectedData,
  assets,
  datasets,
  selectedDatasets,
  dataSources,
  MSSE,
  imageryLayers,
  controllers,
  lastCurrentTime,
  setLastCurrentTime,
  setBillboard,
  publicTask,
  initVars,
  selectedDataIDs,
  setSelectedDataIDs,
  sourceDivs,
  setSelectedDatasets,
  setDatasets,
  setAssets,
  setODMProjects,
  zoomOnDataSelect,
  setZoomOnDataSelect,
  selectedDimension,
  billboard,
  setSelectedDimension,
  setMSSE,
  init,
  odmProjects,
  loadingFinished,
  setLoadingFinshed,
  mousePosition,
  setTimelineOnDataSelect,
  timelineOnDataSelect,
  cropBoxes,
  cropControllers,
  cropRectangles,
  cropBoxMap,
  setCropBoxMap,
} from "./State.js";
import {
  loadAsset,
  loadData,
  setScreenSpaceError,
  fetchIndexAssets,
  fetchWebODMProjects,
  fetchPublicTask,
  syncTimeline,
} from "./Datasets.js";
import {
  setupSidebar,
  upload,
  addFileInput,
  openModal,
  closeModal,
  loadSelectedDataIDs,
} from "./Sidebar.js";
import { closeGraphModal, loadCSVGraphs, loadInfluxGraphs } from "./Graphs.js";
import { readUrlParams } from "./URL.js";
import { applyAlpha, getAlpha } from "./Style.js";
import { cropBox } from "./CropBox.js";
import { cropRectangleMap } from "./CropRectangleMap.js";

Cesium.Ion.defaultAccessToken = cesiumIonAccessToken;

window.CESIUM_BASE_URL = "/cesium/Build/Cesium";

const handleBillboard = (billboard) => {
  setBillboard(billboard);
  selectedDatasets.map((data) => {
    if (entities[data.asset.id] && entities[data.asset.id][data.id]) {
      entities[data.asset.id][data.id].polygon.show = !billboard;
      entities[data.asset.id][data.id].billboard.show = billboard;
    }
  });
};

Sandcastle.addToolbarMenu(
  [
    { text: "Ground Image", onselect: () => handleBillboard(false) },
    { text: "Billboard Image", onselect: () => handleBillboard(true) },
  ],
  "image-series-toolbar"
);

readUrlParams();

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
  113.338953078,
  -43.6345972634,
  153.569469029,
  -10.6681857235
);

if (window.self !== window.top) {
  document.getElementById("nav-header").remove();
  document.getElementById("cesiumContainer").style.height = "100%";
  document.getElementById("sidebar-wrapper").style.height = "100%";
  document.getElementById("sidebar").style.height = "100%";
  document.getElementById("sidebar-close-button").style.top = "20px";
  var shareButtonCesiumToolbar = document.createElement("button");
  shareButtonCesiumToolbar.id = "share-button";
  shareButtonCesiumToolbar.className =
    "cesium-button cesium-toolbar-button cesium-home-button";
  shareButtonCesiumToolbar.innerHTML = `
  <svg viewBox="0 0 16 16" style="padding: 2px;">
    <g id="share_Page-1" stroke="none" stroke-width="1" fill-rule="evenodd">
      <g fill-rule="nonzero">
          <g>
              <path d="M5.97733131,7.62936833 C5.99229467,7.75081434 6,7.87450733 6,8 C6,8.1254927 5.99229467,8.2491857 5.97733131,8.3706317 L10.9173886,10.8406603 C11.456951,10.3201529 12.1910876,10 13,10 C14.6568542,10 16,11.3431458 16,13 C16,14.6568542 14.6568542,16 13,16 C11.3431458,16 10,14.6568542 10,13 C10,12.8745073 10.0077053,12.7508143 10.0226687,12.6293683 L5.08261143,10.1593397 C4.54304902,10.6798471 3.80891237,11 3,11 C1.34314575,11 0,9.6568542 0,8 C0,6.34314575 1.34314575,5 3,5 C3.80891237,5 4.54304902,5.32015293 5.08261143,5.84066029 L10.0226687,3.37063167 C10.0077053,3.24918566 10,3.12549267 10,3 C10,1.34314575 11.3431458,0 13,0 C14.6568542,0 16,1.34314575 16,3 C16,4.65685425 14.6568542,6 13,6 C12.1910876,6 11.456951,5.67984707 10.9173886,5.15933971 L5.97733131,7.62936833 Z M13,14 C13.5522847,14 14,13.5522847 14,13 C14,12.4477153 13.5522847,12 13,12 C12.4477153,12 12,12.4477153 12,13 C12,13.5522847 12.4477153,14 13,14 Z M13,4 C13.5522847,4 14,3.55228475 14,3 C14,2.44771525 13.5522847,2 13,2 C12.4477153,2 12,2.44771525 12,3 C12,3.55228475 12.4477153,4 13,4 Z M3,9 C3.55228475,9 4,8.5522847 4,8 C4,7.44771525 3.55228475,7 3,7 C2.44771525,7 2,7.44771525 2,8 C2,8.5522847 2.44771525,9 3,9 Z" id="share_path-1"></path>
          </g>
      </g>
    </g>
  </svg>`;
}

setViewer(
  new Cesium.Viewer("cesiumContainer", {
    // imageryProvider: new Cesium.IonImageryProvider({ assetId: 3954 }),//sentinel-2
    terrainProvider: Cesium.createWorldTerrain({ requestWaterMask: true }),
    vrButton: true,
    fullscreenElement: "cesiumContainer",
    animation: false,
    useBrowserRecommendedResolution: false,
  })
);

viewer.timeline._trackListEle.onmousemove = function (e) {
  mousePosition.x = e.offsetX;
  mousePosition.y = e.offsetY;

  viewer.timeline._makeTics();
};

viewer.timeline._trackListEle.onmouseleave = function (e) {
  mousePosition.x = null;
  mousePosition.y = null;
  viewer.timeline._makeTics();
};

if (window.self !== window.top) {
  document
    .getElementsByClassName("cesium-viewer-toolbar")[0]
    .prepend(shareButtonCesiumToolbar);
}

viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
viewer.scene.globe.depthTestAgainstTerrain = false;

// viewer.animation.viewModel.dateFormatter = (date, viewModel) => {
//   const localDate = Cesium.JulianDate.toDate(date);
//   return localDate.toLocaleString('en-au', {year: 'numeric', month: 'long', day: 'numeric'} )
// };

// viewer.animation.viewModel.timeFormatter = (date, viewModel) => {
//   const localDate = Cesium.JulianDate.toDate(date);
//   return localDate.toLocaleTimeString();
// };

Cesium.Timeline.prototype.makeLabel = function (time) {
  const localDate = Cesium.JulianDate.toDate(time);
  return localDate.toLocaleString("en-au", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};

var uploadPage;
if (window.location.href.toLowerCase().includes("cesium/apps/asdc/uploads")) {
  uploadPage = true;
  document.getElementById("user-dropdown-button").style.display = "none";
} else {
  uploadPage = false;
}

Cesium.TrustedServers.add("asdc.cloud.edu.au", 443);
Cesium.TrustedServers.add("dev.asdc.cloud.edu.au", 443);

if (init) {
  if (init.billboard != undefined) {
    setBillboard(init.billboard);
    document.getElementById(
      "image-series-toolbar"
    ).childNodes[0].selectedIndex = init.billboard ? 1 : 0;
  }
  if (init.selectedDimension != undefined) {
    setSelectedDimension(init.selectedDimension);
  }
  if (init.zoomOnDataSelect != undefined) {
    setZoomOnDataSelect(init.zoomOnDataSelect);
    document.getElementById("zoom-checkbox").checked = init.zoomOnDataSelect;
  }

  if (init.MSSE != undefined) {
    setMSSE(parseInt(init.MSSE));
    document.getElementById("msse-slider").value = parseInt(init.MSSE);
    document.getElementById("msse-value").innerHTML = MSSE + " %";
  }

  if (init.index) {
    //shared webodm datasets
    init.index.assets.map((a) => {
      if (assets.length > 0) {
        a.id = assets[assets.length - 1].id + 1;
      } else {
        a.id = 1;
      }
    });
    setAssets([...assets, ...init.index.assets]);
    init.index.assets.map((a) => {
      a.data.map((id) => {
        var data = init.index.datasets.find((data) => data.id == id);
        if (data) {
          data.asset = a;
        }
      });
    });
    setDatasets([...datasets, ...init.index.datasets]);
  }
}

export const applyInit = () => {
  if (init) {
    if (init.currentTime) {
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(
        new Date(init.currentTime)
      );
    }
    if (init.timeline) {
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(new Date(init.timeline.start)),
        Cesium.JulianDate.fromDate(new Date(init.timeline.end))
      );
    }
    if (init.cameraSelectedDataID) {
      setSelectedData(datasets.find((d) => d.id == init.cameraSelectedDataID));
    }
    if (init.imageryLayersOrder) {
      var layers = [];
      viewer.imageryLayers._layers.slice(1).map((l) => {
        layers[init.imageryLayersOrder.indexOf(l.data.id)] = l;
      });
      layers.map((l) => viewer.imageryLayers.raiseToTop(l));
    }
    if (init.opacity) {
      selectedDatasets
        .filter((d) => Object.keys(init.opacity).includes(d.id.toString()))
        .map((data) => {
          applyAlpha(
            parseFloat(init.opacity[data.id.toString()]),
            data.asset,
            data
          );
        });
    }

    if (init.cropBoxes || init.cropRectangles) {
      selectedDatasets.map((data) => {
        if (init.cropBoxes[data.id]) {
          tilesets[data.asset["id"]][data.id].readyPromise.then(function (
            tileset
          ) {
            if (!cropBoxes[data.id]) {
              cropBoxes[data.id] = new cropBox(data);

              var cropButton = document.getElementById(`cropButton-${data.id}`);
              cropButton.style.color = "#0075ff";

              var cropDiv = document.getElementById(`cropDiv-${data.id}`);
              cropDiv.style.display = "block";

              var panel = cropDiv.parentElement;
              var height = 0;
              var children = [...panel.children];
              for (var i = 0; i < children.length; i++) {
                height +=
                  children[i].scrollHeight +
                  children[i].getBoundingClientRect().height;
              }

              panel.style.maxHeight = height + "px";

              var elem = panel.parentElement;
              while (
                elem &&
                elem.id != "sidebar" &&
                elem.id != "sidebar-data-buttons"
              ) {
                var height = 0;
                var children = [...elem.children];
                for (var i = 0; i < children.length; i++) {
                  if (children[i].style.maxHeight) {
                    height += parseFloat(
                      children[i].style.maxHeight.slice(0, -2)
                    );
                  } else {
                    height +=
                      children[i].scrollHeight +
                      children[i].getBoundingClientRect().height;
                  }
                }
                elem.style.maxHeight = height + "px";

                elem = elem.parentElement;
              }

              var showCheckbox = document.getElementById(
                `crop-checkbox-${data.id}`
              );
              showCheckbox.checked = init.cropBoxes[data.id].show;
              showCheckbox.onchange();

              var aboveGroundCheckbox = document.getElementById(
                `aboveGroundCheckbox-${data.id}`
              );
              aboveGroundCheckbox.checked =
                init.cropBoxes[data.id].keepBoxAboveGround;
              if (cropBoxes[data.id].keepBoxAboveGround) {
                cropBoxes[data.id].keepBoxAboveGround =
                  init.cropBoxes[data.id].keepBoxAboveGround;
                cropBoxes[data.id].setBoxAboveGround();
              }

              cropBoxes[data.id].trs = init.cropBoxes[data.id].trs;

              var directionSelect = document.getElementById(
                `crop-direction-${data.id}`
              );
              directionSelect.value = init.cropBoxes[data.id].direction;
              directionSelect.onchange();

              cropBoxes[data.id].updateBox();
              cropBoxes[data.id].onChange({
                modelMatrix: cropBoxes[data.id].modelMatrix,
                translationRotationScale: cropBoxes[data.id].trs,
              });
              cropBoxes[data.id].updateEntitiesOnOrientationChange();
            }
          });
        }
      });
    }
  }
};

var odmToken = {};
//with task parameter specified
if (publicTask) {
  document.getElementById("user-dropdown-button").style.display = "none";
  if (init && init.camera) {
    viewer.camera.position = new Cesium.Cartesian3(
      init.camera.position.x,
      init.camera.position.y,
      init.camera.position.z
    );
    viewer.camera.direction = new Cesium.Cartesian3(
      init.camera.direction.x,
      init.camera.direction.y,
      init.camera.direction.z
    );
    viewer.camera.up = new Cesium.Cartesian3(
      init.camera.up.x,
      init.camera.up.y,
      init.camera.up.z
    );
  }
  fetchPublicTask().then(() => {
    setLoadingFinshed(true);
    setupSidebar(false);
    loadSelectedDataIDs(!(init && init.camera));

    if (init) {
      applyInit(init);
      cameraMoveEndListener();
    }
  });
} else {
  //with index param specified
  if (new URLSearchParams(window.location.search).get("index")) {
    document.getElementById("user-dropdown-button").style.display = "none";
    if (init && init.camera) {
      viewer.camera.position = new Cesium.Cartesian3(
        init.camera.position.x,
        init.camera.position.y,
        init.camera.position.z
      );
      viewer.camera.direction = new Cesium.Cartesian3(
        init.camera.direction.x,
        init.camera.direction.y,
        init.camera.direction.z
      );
      viewer.camera.up = new Cesium.Cartesian3(
        init.camera.up.x,
        init.camera.up.y,
        init.camera.up.z
      );
    }
    fetchIndexAssets().then(() => {
      setLoadingFinshed(true);

      if (!(init && init.camera) && initVars && initVars.camera) {
        viewer.camera.position = new Cesium.Cartesian3(
          initVars.camera.position.x,
          initVars.camera.position.y,
          initVars.camera.position.z
        );
        viewer.camera.direction = new Cesium.Cartesian3(
          initVars.camera.direction.x,
          initVars.camera.direction.y,
          initVars.camera.direction.z
        );
        viewer.camera.up = new Cesium.Cartesian3(
          initVars.camera.up.x,
          initVars.camera.up.y,
          initVars.camera.up.z
        );
      }

      setupSidebar(uploadPage, true);
      loadSelectedDataIDs(!(init && init.camera));

      if (initVars && initVars.selectedData && selectedDataIDs.length === 0) {
        setSelectedDataIDs(initVars.selectedData);
        loadSelectedDataIDs(false);
      }

      if (init) {
        applyInit(init);
        cameraMoveEndListener();
      }
    });
  } else {
    if (init && init.camera) {
      viewer.camera.position = new Cesium.Cartesian3(
        init.camera.position.x,
        init.camera.position.y,
        init.camera.position.z
      );
      viewer.camera.direction = new Cesium.Cartesian3(
        init.camera.direction.x,
        init.camera.direction.y,
        init.camera.direction.z
      );
      viewer.camera.up = new Cesium.Cartesian3(
        init.camera.up.x,
        init.camera.up.y,
        init.camera.up.z
      );
    }
    //main page and upload
    fetchIndexAssets().then(() => {
      if (!(init && init.camera) && initVars && initVars.camera) {
        viewer.camera.position = new Cesium.Cartesian3(
          initVars.camera.position.x,
          initVars.camera.position.y,
          initVars.camera.position.z
        );
        viewer.camera.direction = new Cesium.Cartesian3(
          initVars.camera.direction.x,
          initVars.camera.direction.y,
          initVars.camera.direction.z
        );
        viewer.camera.up = new Cesium.Cartesian3(
          initVars.camera.up.x,
          initVars.camera.up.y,
          initVars.camera.up.z
        );
      }

      setupSidebar(uploadPage);
      loadSelectedDataIDs(!(init && init.camera));

      if (init) {
        applyInit(init);
        cameraMoveEndListener();
      }

      if (!uploadPage) {
        fetchWebODMProjects(odmToken)
          .then(() => {
            setLoadingFinshed(true);
            setupSidebar(uploadPage);
            loadSelectedDataIDs(!(init && init.camera));

            if (
              initVars &&
              initVars.selectedData &&
              selectedDataIDs.length === 0
            ) {
              //todo: use applyInit as well
              setSelectedDataIDs(initVars.selectedData);
              loadSelectedDataIDs(false);
            }

            if (init) {
              applyInit(init);
              cameraMoveEndListener();
            }
          })
          .catch(() => {
            setLoadingFinshed(true);
            if (
              initVars &&
              initVars.selectedData &&
              selectedDataIDs.length === 0
            ) {
              setSelectedDataIDs(initVars.selectedData);
              loadSelectedDataIDs(false);
            }
          });
      }
    });
  }
}

var cameraMoveEndListener = () => {
  if (!assets) return;

  var viewMenu = [];
  var selectedIndex = 0;

  assets.map((asset) => {
    if (!uploadPage && asset.categoryID == 6) return;
    if (uploadPage && asset.categoryID != 6) return;
    if (asset.data) {
      var assetDataset = [];
      asset.data?.map((dataID) => {
        for (var i = 0; i < datasets.length; i++) {
          if (datasets[i].id == dataID) {
            assetDataset.push(datasets[i]);
            break;
          }
        }
      });

      assetDataset.map((data) => {
        if (data.position) {
          var lng = data.position.lng;
          var lat = data.position.lat;
          var height = data.position.height;

          var dataPosition = Cesium.Cartographic.toCartesian(
            new Cesium.Cartographic.fromDegrees(lng, lat, height)
          );

          var distance = Cesium.Cartesian3.distance(
            viewer.camera.position,
            dataPosition
          );
          if (data.bounds) {
            var rect = new Cesium.Rectangle.fromDegrees(
              data.bounds[0],
              data.bounds[1],
              data.bounds[2],
              data.bounds[3]
            );

            var rectBoundingSphere = Cesium.BoundingSphere.fromPoints(
              Cesium.Rectangle.subsample(rect)
            );
          }
          if (
            distance <=
            (data.boundingSphereRadius
              ? data.boundingSphereRadius * 2.5 > 2000
                ? data.boundingSphereRadius * 2.5
                : 2000
              : data.bounds
              ? rectBoundingSphere.radius * 2.5 > 2000
                ? rectBoundingSphere.radius * 2.5
                : 2000
              : 2000)
          ) {
            viewMenu.push({
              text:
                (data.date
                  ? `${asset.name} - ${data.date}`
                  : `${asset.name} - No Date`) +
                (data.name ? " - " + data.name : "") +
                (data.asset.categoryID == -3 ? " - Shared" : ""),
              onselect: () => {
                if (data != selectedData) {
                  loadData(asset, data, false, true, true, true);

                  var newDataIDs = [];
                  selectedDatasets.map((d) => {
                    newDataIDs.push(d.id);
                  });

                  newDataIDs.sort((a, b) => a - b);

                  var dataIDs = newDataIDs.join("&");

                  window.history.pushState(
                    "",
                    "",
                    uploadPage
                      ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
                          window.location.search +
                          window.location.hash
                      : `/cesium/Apps/ASDC/${dataIDs}` +
                          window.location.search +
                          window.location.hash
                  );

                  var checkbox = document.getElementById(
                    `dataCheckbox-${data.id}`
                  );
                  if (checkbox) {
                    checkbox.checked = true;
                  }

                  var assetCheckbox = document.getElementById(
                    `assetCheckbox-${asset.id}`
                  );
                  if (
                    asset.data.every((ad) =>
                      selectedDatasets.map((d) => d.id).includes(ad)
                    )
                  ) {
                    if (assetCheckbox) {
                      assetCheckbox.checked = true;
                      assetCheckbox.indeterminate = false;
                    }
                  } else {
                    assetCheckbox.checked = false;
                    assetCheckbox.indeterminate = true;
                  }
                }

                setSelectedData(data);
              },
              data: data,
            });

            if (selectedData && selectedData == data) {
              selectedIndex = viewMenu.length - 1;
            } else if (
              !selectedIndex &&
              selectedDatasets.find((d) => d.id == data.id) &&
              (data.type != "csv" || //todo: other types?
                (tilesets[data.asset.id] &&
                  tilesets[data.asset.id][data.id] &&
                  tilesets[data.asset.id][data.id].show) ||
                (imageryLayers[data.asset.id] &&
                  imageryLayers[data.asset.id][data.id] &&
                  imageryLayers[data.asset.id][data.id].show) ||
                (dataSources[data.asset.id] &&
                  dataSources[data.asset.id][data.id] &&
                  dataSources[data.asset.id][data.id].show))
            ) {
              selectedIndex = viewMenu.length - 1;
            }
          }
        }
      });
    }
  });

  var toolbar = document.getElementById("cam-toolbar");
  var toolbarRow = document.getElementById("cam-toolbar-row");

  while (toolbar.firstChild) {
    toolbar.removeChild(toolbar.firstChild);
  }

  if (viewMenu.length > 0) {
    Sandcastle.addToolbarMenu(viewMenu, "cam-toolbar");
    toolbarRow.style.display = "table-row";
    document.getElementById("cam-toolbar").childNodes[0].selectedIndex =
      selectedIndex;

    if (selectedData && selectedData != viewMenu[selectedIndex].data) {
      //to avoid loading right after removing
      viewMenu[selectedIndex].onselect();
    }
  } else {
    toolbarRow.style.display = "none";
  }
};
viewer.camera.moveEnd.addEventListener(cameraMoveEndListener);

viewer.clock.onTick.addEventListener((clock) => {
  var currentDate = Cesium.JulianDate.toDate(clock.currentTime);
  selectedAssetIDs.map((assetID) => {
    var timelineAssetDatasets = selectedDatasets.filter(
      (data) =>
        new Date(data.date) != "Invalid Date" &&
        data.asset.id == assetID &&
        (data.type == "PointCloud" ||
          data.type == "EPTPointCloud" ||
          data.type == "Imagery" ||
          data.type == "GeoJSON" ||
          data.type === "ModelTileset")
    );

    timelineAssetDatasets.sort(function (a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    for (var i = 0; i < timelineAssetDatasets.length; i++) {
      var prevDateDataset = timelineAssetDatasets.find((d, dataIndex) => {
        if (
          dataIndex < i &&
          new Date(d.date).getTime() <
            new Date(timelineAssetDatasets[i].date).getTime()
        ) {
          return d;
        }
      });
      var nextDateDataset = timelineAssetDatasets.find((d, dataIndex) => {
        if (
          dataIndex > i &&
          new Date(d.date).getTime() >
            new Date(timelineAssetDatasets[i].date).getTime()
        ) {
          return d;
        }
      });

      if (
        (!prevDateDataset ||
          new Date(timelineAssetDatasets[i].date).getTime() <=
            currentDate.getTime()) &&
        (!nextDateDataset ||
          new Date(nextDateDataset.date).getTime() > currentDate.getTime())
      ) {
        if (
          tilesets[assetID] &&
          tilesets[assetID][timelineAssetDatasets[i].id]
        ) {
          if (Array.isArray(tilesets[assetID][timelineAssetDatasets[i].id])) {
            tilesets[assetID][timelineAssetDatasets[i].id].map((tileset) => {
              if (MSSE !== 0) {
                if (tileset) {
                  tileset.show = true;
                }
              }
            });
          } else {
            if (MSSE !== 0) {
              tilesets[assetID][timelineAssetDatasets[i].id].show = true;

              if (
                cropBoxes[timelineAssetDatasets[i].id] &&
                cropBoxes[timelineAssetDatasets[i].id].clippingPlanes.enabled &&
                document.getElementById(
                  `crop-checkbox-${timelineAssetDatasets[i].id}`
                ).checked
              ) {
                cropBoxes[timelineAssetDatasets[i].id].toggleVisibilityOn();
              }
            }
          }
        }
        if (
          imageryLayers[assetID] &&
          imageryLayers[assetID][timelineAssetDatasets[i].id]
        ) {
          imageryLayers[assetID][timelineAssetDatasets[i].id].show = true;
        }
        if (
          dataSources[assetID] &&
          dataSources[assetID][timelineAssetDatasets[i].id]
        ) {
          dataSources[assetID][timelineAssetDatasets[i].id].show = true;
        }
      } else {
        if (
          tilesets[assetID] &&
          tilesets[assetID][timelineAssetDatasets[i].id]
        ) {
          if (Array.isArray(tilesets[assetID][timelineAssetDatasets[i].id])) {
            tilesets[assetID][timelineAssetDatasets[i].id].map((tileset) => {
              if (tileset) {
                tileset.show = false;
              }
            });
          } else {
            tilesets[assetID][timelineAssetDatasets[i].id].show = false;

            if (cropBoxes[timelineAssetDatasets[i].id]) {
              cropBoxes[timelineAssetDatasets[i].id].toggleVisibilityOff();
            }
          }
        }
        if (
          imageryLayers[assetID] &&
          imageryLayers[assetID][timelineAssetDatasets[i].id]
        ) {
          imageryLayers[assetID][timelineAssetDatasets[i].id].show = false;
        }
        if (
          dataSources[assetID] &&
          dataSources[assetID][timelineAssetDatasets[i].id]
        ) {
          dataSources[assetID][timelineAssetDatasets[i].id].show = false;
        }
      }
    }
  });

  if (lastCurrentTime) {
    var noon = new Date(
      lastCurrentTime.getFullYear(),
      lastCurrentTime.getMonth(),
      lastCurrentTime.getDate(),
      12,
      0,
      0
    );
  }
  if (
    !lastCurrentTime ||
    Math.abs(lastCurrentTime.getTime() - currentDate.getTime()) >= 86400000 ||
    currentDate.getTime() < noon.getTime()
  ) {
    if (currentDate.getHours() < 12) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    currentDate.setHours(12, 0, 0);

    setLastCurrentTime(currentDate);

    if (currentDate.getTime() > new Date().getTime()) {
      currentDate = new Date();
      if (currentDate.getHours() < 12) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      currentDate.setHours(12, 0, 0);
    }

    selectedDatasets.map((data) => {
      if (data.type === "ImageSeries") {
        if (entities[data.asset.id] && entities[data.asset.id][data.id]) {
          if (!controllers[data.id]) {
            controllers[data.id] = new AbortController();
          } else {
            controllers[data.id].abort();
            controllers[data.id] = new AbortController();
          }
          if (data.source && data.source.type === "csv") {
            fetch(data.source.url, {
              cache: "no-store",
              signal: controllers[data.id].signal,
            })
              .then((response) => {
                return response;
              })
              .then((response) => response.text())
              .then((response) => {
                var csvRows = response.split("\n");
                var timeIndex = csvRows[0]
                  .split(",")
                  .indexOf(data.source.columns.time);
                var imageIndex = csvRows[0]
                  .split(",")
                  .indexOf(data.source.columns.image);
                csvRows = csvRows.slice(1, csvRows.length - 1);

                var earliestDate;
                var earliestRow;
                var firstImage;
                for (var row = 0; row < csvRows.length; row++) {
                  var csvRowColumns = csvRows[row].split(",");
                  if (
                    new Date(csvRowColumns[timeIndex]).getTime() <=
                      currentDate &&
                    (!earliestDate ||
                      (earliestDate &&
                        earliestDate.getTime() <
                          new Date(csvRowColumns[timeIndex]).getTime()))
                  ) {
                    earliestDate = new Date(csvRowColumns[timeIndex]);
                    earliestRow = row;
                  }
                  if (
                    new Date(csvRowColumns[timeIndex]).getTime() ===
                    new Date(data.startDateTime).getTime()
                  ) {
                    firstImage = csvRowColumns[imageIndex];
                  }
                }
                if (!!earliestDate && !!earliestRow) {
                  var imageUrl = data.url.replace(
                    "{Image}",
                    csvRows[earliestRow].split(",")[imageIndex]
                  );
                } else {
                  var imageUrl = data.url.replace("{Image}", firstImage);
                }
                entities[data.asset.id][data.id].polygon.material =
                  new Cesium.ImageMaterialProperty({
                    image: imageUrl,
                    color:
                      entities[data.asset.id][data.id].polygon.material.color,
                  });

                entities[data.asset.id][data.id].billboard.image = imageUrl;
              })
              .catch((error) => {
                if (error.name !== "AbortError") {
                  console.log(error);
                }
              });
          } else {
            fetch(
              `/cesium/influx/images?camera=${data.camera}&time=${
                data.timeOffset
                  ? currentDate.getTime() - data.timeOffset
                  : currentDate.getTime()
              }&startTime=${new Date(data.startDateTime).getTime()}`,
              { cache: "no-store", signal: controllers[data.id].signal }
              // { cache: "no-store" }
            )
              .then((response) => {
                if (response.status !== 200) {
                  console.log(response);
                }
                return response;
              })
              .then((response) => response.json())
              .then((response) => {
                if (response.length != 0) {
                  var imageUrl = `https://img.amrf.org.au/cameras/amrf/${
                    data.camera
                  }/${data.camera}~720x/$dirstamp/${
                    data.camera
                  }~720x_$filestamp.jpg?timestamp_ms=${new Date(
                    response[0].time
                  ).getTime()}`;
                } else {
                  var imageUrl = `https://img.amrf.org.au/cameras/amrf/${
                    data.camera
                  }/${data.camera}~720x/$dirstamp/${
                    data.camera
                  }~720x_$filestamp.jpg?timestamp_ms=${new Date(
                    data.startDateTime
                  ).getTime()}`;
                }
                if (
                  entities[data.asset.id][data.id].polygon.material &&
                  entities[data.asset.id][
                    data.id
                  ].polygon.material.image.getValue() !== imageUrl
                ) {
                  entities[data.asset.id][data.id].polygon.material =
                    new Cesium.ImageMaterialProperty({
                      image: imageUrl,
                      color:
                        entities[data.asset.id][data.id].polygon.material.color,
                    });

                  entities[data.asset.id][data.id].billboard.image = imageUrl;
                }
              })
              .catch((error) => {
                if (error.name !== "AbortError") {
                  console.log(error);
                }
              });
          }
        }
      }
      if (data.type == "Influx") {
        loadInfluxGraphs(data);
      }
      if (data.type === "CSV") {
        if (!data.graphs.every((g) => g.range)) {
          loadCSVGraphs(data);
        }
      }
    });
  }
});

var clickHandler = viewer.screenSpaceEventHandler.getInputAction(
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
  // console.log(viewer.scene.pickPosition(movement.position));
  // var carto = Cesium.Cartographic.fromCartesian(viewer.scene.pickPosition(movement.position));
  // console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
  // console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
  // console.log(carto.height);
  var pickedFeature = viewer.scene
    .drillPick(movement.position)
    .filter((feature) => {
      if (!(feature.primitive instanceof Cesium.Cesium3DTileset))
        return feature;
    })[0];

  if (!Cesium.defined(pickedFeature)) {
    clickHandler(movement);
    return;
  }

  var selectedEntity = pickedFeature.id;

  if (selectedEntity) {
    if (selectedEntity.id.startsWith("marker")) {
      var id = selectedEntity.id.slice("marker_".length);
      for (var i = 0; i < assets.length; i++) {
        if (assets[i].id === parseInt(id)) {
          assets[i].data.map((id) => {
            var checkbox = document.getElementById(`dataCheckbox-${id}`);
            if (checkbox) {
              checkbox.checked = true;
            }
          });
          var assetCheckbox = document.getElementById(
            `assetCheckbox-${assets[i].id}`
          );
          if (assetCheckbox) {
            assetCheckbox.checked = true;
          }

          loadAsset(assets[i], true, true);

          var newDataIDs = [...assets[i].data];
          selectedDatasets.map((d) => {
            if (!newDataIDs.includes(d.id)) {
              newDataIDs.push(d.id);
            }
          });
          newDataIDs.sort((a, b) => a - b);
          var dataIDs = newDataIDs.join("&");
          window.history.pushState(
            "",
            "",
            uploadPage
              ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
                  window.location.search +
                  window.location.hash
              : `/cesium/Apps/ASDC/${dataIDs}` +
                  window.location.search +
                  window.location.hash
          );
          return;
        }
      }
    } else {
      if (selectedEntity.properties) {
        selectedEntity.description =
          '<table class="cesium-infoBox-defaultTable"><tbody>';
        for (
          var i = 0;
          i < selectedEntity.properties._propertyNames.length;
          i++
        ) {
          selectedEntity.description +=
            "<tr><th>" +
            selectedEntity.properties._propertyNames[i] +
            "</th><td>" +
            selectedEntity.properties[
              selectedEntity.properties._propertyNames[i]
            ].getValue() +
            "</td></tr>";
        }
        selectedEntity.description += "</tbody></table>";

        closeGraphModal();
        viewer.selectedEntity = selectedEntity;
      }
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

document.getElementById("sidebar-upload-button").onclick = openModal;
document.getElementById("close-upload-modal").onclick = closeModal;
document.getElementById("add-file-button").onclick = addFileInput;
document.getElementById("modal-upload-button").onclick = upload;
document.getElementById("close-graph").onclick = closeGraphModal;
document.getElementById("msse-slider").oninput = setScreenSpaceError;

var sidebarOpen = true;
document.getElementById("sidebar-close-button").onclick = () => {
  if (sidebarOpen) {
    document.getElementById("sidebar-close-button").style.left = "0";
    document.getElementById(
      "sidebar-close-button"
    ).innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24">
        <path 
          fill="black" d="M 10 2 L 20 10" stroke="black" stroke-width="3" stroke-linecap="round"
        />
        <path fill="black" d="M 20 10 L 10 20" stroke="black" stroke-width="3" stroke-linecap="round"
        />
      </svg>`;
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("cesiumContainer").style.left = "0";
    document.getElementById("cesiumContainer").style.width = "100%";
  } else {
    document.getElementById("sidebar-close-button").style.left = "300px";
    document.getElementById(
      "sidebar-close-button"
    ).innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24">
        <path 
          fill="black" d="M 2 2 L 20 20" stroke="black" stroke-width="3" stroke-linecap="round"
        />
        <path fill="black" d="M 20 2 L 2 20" stroke="black" stroke-width="3" stroke-linecap="round"
        />
      </svg>`;
    document.getElementById("sidebar").style.width = "300px";
    document.getElementById("cesiumContainer").style.left = "300px";
    document.getElementById("cesiumContainer").style.width =
      "calc(100% - 300px)";
  }
  sidebarOpen = !sidebarOpen;
};

if (document.getElementById("user-dropdown-button")) {
  document.getElementById("user-dropdown-button").onclick = () => {
    var userDropDown = document.getElementById("user-dropdown-list");
    if (userDropDown.style.display == "block") {
      userDropDown.style.display = "none";
      document.getElementById("user-dropdown-button").style.background = null;
    } else {
      userDropDown.style.display = "block";
      document.getElementById("user-dropdown-button").style.background =
        "#5b8b51";
    }
  };
}

if (document.getElementById("login-logout-button")) {
  document.getElementById("login-logout-button").onclick = () => {
    odmToken.cancel();

    fetch(`${baseURL}/logout/`, {
      cache: "no-store",
      credentials: "include",
      mode: "no-cors",
    }).then(() => {
      document.getElementById("login-logout-button-text").innerHTML = "Login";

      var signInButton = document.createElement("div");
      signInButton.className = "sidebar-item";
      signInButton.style["text-align"] = "center";
      signInButton.innerHTML = "Login here to view your ASDC data";
      signInButton.onclick = () => {
        window.location.href = `${baseURL}/login/auth0?next=${window.location.href}`;
      };

      const children = [
        ...sourceDivs["WebODM Projects"].nextElementSibling.children,
      ];
      for (var i = 0; i < children.length; i++) {
        sourceDivs["WebODM Projects"].nextElementSibling.removeChild(
          children[i]
        );
      }

      sourceDivs["WebODM Projects"].nextElementSibling.appendChild(
        signInButton
      );

      if (sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight) {
        sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight =
          signInButton.scrollHeight + "px";
      }

      document.getElementById("login-logout-button").onclick =
        signInButton.onclick;

      selectedDatasets
        .filter((d) => d.asset.project)
        .map((d) => {
          if (d.type == "Imagery") {
            viewer.imageryLayers.remove(imageryLayers[d.asset.id][d.id], true);
            imageryLayers[d.asset.id][d.id] =
              imageryLayers[d.asset.id][d.id] &&
              imageryLayers[d.asset.id][d.id].destroy();
          } else if (d.type === "EPTPointCloud") {
            viewer.scene.primitives.remove(tilesets[d.asset.id][d.id]);
            tilesets[d.asset.id][d.id] =
              tilesets[d.asset.id][d.id] &&
              tilesets[d.asset.id][d.id].destroy();
          }
        });
      setSelectedDatasets(selectedDatasets.filter((d) => !d.asset.project));
      setDatasets(datasets.filter((d) => d.asset && !d.asset.project));

      assets
        .filter((a) => a.project)
        .map((a) => {
          markersDataSource.entities.removeById("marker_" + a.id);
        });

      setAssets(assets.filter((a) => !a.project));
      setODMProjects();

      viewer.camera.moveEnd.raiseEvent();
      if (
        !selectedDatasets.find(
          (d) =>
            d.type == "PointCloud" ||
            d.type == "EPTPointCloud" ||
            d.type == "ModelTileset"
        )
      ) {
        document.getElementById("msse-slider-row").style.display = "none";
        document.getElementById("dims-toolbar-row").style.display = "none";
      }
    });
  };
}

document.getElementById("zoom-checkbox").onchange = (e) => {
  setZoomOnDataSelect(e.target.checked);
};

document.getElementById("timeline-checkbox").onchange = (e) => {
  setTimelineOnDataSelect(e.target.checked);
};

document.getElementById("sync-timeline-button").onclick = (e) => {
  syncTimeline(false);
};

var mapRect;
var clippingDrawButton = document.getElementById("clip-draw-button");

clippingDrawButton.onclick = (e) => {
  if (mapRect) {
    mapRect.destroy();
    mapRect = null;
  }
  if (cropBoxMap) {
    cropBoxMap.destroy();
    setCropBoxMap(null);
  }
  if (clippingDrawButton.style.background) {
    clippingDrawButton.style.background = null;
  } else {
    clippingDrawButton.style.background = "#48b";
    mapRect = new cropRectangleMap();
  }
};

document.getElementById("clip-remove-button").onclick = (e) => {
  if (mapRect) {
    mapRect.destroy();
    mapRect = null;
  }
  if (cropBoxMap) {
    cropBoxMap.destroy();
    setCropBoxMap(null);
  }
  clippingDrawButton.style.background = null;
};

document.getElementById("clip-export-button").onclick = (e) => {
  if (!cropBoxMap) return;
  var regions = [];
  Object.keys(tilesets).map((a) => {
    Object.keys(tilesets[a]).map((d) => {
      var data = selectedDatasets.find((data) => data.id == d);
      if (data) {
        var t = tilesets[a][d];

        if (data.asset.project && odmProjects) {
          var projectName = odmProjects.find(
            (p) => p.id == data.asset.project
          ).name;
          var fileName = `${projectName}_${data.asset.name}_PointCloud_Crop.laz`;
        } else {
          var fileName = `${data.asset.name}_${
            data.date
              ? new Date(data.date).toLocaleDateString("en-au", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                })
              : ""
          }${data.name ? "-" + data.name : ""}_PointCloud_Crop.laz`;
        }

        var scalePoints = cropBoxMap.scalePoints.slice(0, 8);
        var groundScalePoints = [
          scalePoints[1],
          scalePoints[3],
          scalePoints[5],
          scalePoints[7],
        ];

        var points = groundScalePoints.map((entity) => {
          var cartesianPos = entity.position.getValue();
          return cartesianPos;
        });

        var rect;
        if (!t.root.boundingVolume.rectangle) {
          if (
            t.root.boundingVolume.boundingVolume instanceof
            Cesium.OrientedBoundingBox
          ) {
            var corners = Cesium.OrientedBoundingBox.computeCorners(
              t.root.boundingVolume.boundingVolume
            );
            rect = Cesium.Rectangle.fromCartesianArray(corners);
          }
        } else {
          rect = t.root.boundingVolume.rectangle;
        }
        var intersection = Cesium.Rectangle.intersection(
          rect,
          Cesium.Rectangle.fromCartesianArray(points)
        );

        if (intersection) {
          if (data.type == "EPTPointCloud") {
            var urlParams = new URLSearchParams(t._url.split("?")[1]);
            var ept = urlParams.get("ept");
          } else {
            var ept = data.source.ept;
          }

          if (!ept) return;

          if (data.position && t.boundingSphereCenter) {
            var offset = Cesium.Cartographic.toCartesian(
              new Cesium.Cartographic.fromDegrees(
                data["position"]["lng"],
                data["position"]["lat"],
                data["position"]["height"]
              )
            );
            var translation = Cesium.Cartesian3.subtract(
              offset,
              t.boundingSphereCenter,
              new Cesium.Cartesian3()
            );
          }
          var now = Cesium.JulianDate.now();

          var scalePoints = cropBoxMap?.scalePoints.slice(0, 8);
          var groundScalePoints = [
            scalePoints[1],
            scalePoints[3],
            scalePoints[5],
            scalePoints[7],
            scalePoints[1],
          ];

          var wktPolygon = "POLYGON((";
          groundScalePoints.map((entity, index) => {
            var translatedPos = new Cesium.Cartesian3();
            var cartesianPos = entity.position.getValue(now);
            cartesianPos.clone(translatedPos);
            if (translation) {
              Cesium.Cartesian3.subtract(
                cartesianPos,
                translation,
                translatedPos
              );
            }
            var pos = Cesium.Cartographic.fromCartesian(translatedPos);
            var lon = pos.longitude * Cesium.Math.DEGREES_PER_RADIAN;
            var lat = pos.latitude * Cesium.Math.DEGREES_PER_RADIAN;
            wktPolygon += `${lon} ${lat}`;
            if (index != groundScalePoints.length - 1) {
              wktPolygon += ",";
            }
          });

          wktPolygon += "))";

          var heights = scalePoints.map((entity) => {
            var translatedPos = new Cesium.Cartesian3();
            var cartesianPos = entity.position.getValue(now);
            cartesianPos.clone(translatedPos);
            if (translation) {
              Cesium.Cartesian3.subtract(
                cartesianPos,
                translation,
                translatedPos
              );
            }
            var pos = Cesium.Cartographic.fromCartesian(translatedPos);
            return pos.height;
          });

          var maxHeight = Math.max(...heights);
          var minHeight = Math.min(...heights);

          var lons = scalePoints.map((entity) => {
            var translatedPos = new Cesium.Cartesian3();
            var cartesianPos = entity.position.getValue(now);
            cartesianPos.clone(translatedPos);
            if (translation) {
              Cesium.Cartesian3.subtract(
                cartesianPos,
                translation,
                translatedPos
              );
            }
            var pos = Cesium.Cartographic.fromCartesian(translatedPos);
            return pos.longitude * Cesium.Math.DEGREES_PER_RADIAN;
          });
          var minLon = Math.min(...lons);
          var maxLon = Math.max(...lons);

          var lats = scalePoints.map((entity) => {
            var translatedPos = new Cesium.Cartesian3();
            var cartesianPos = entity.position.getValue(now);
            cartesianPos.clone(translatedPos);
            if (translation) {
              Cesium.Cartesian3.subtract(
                cartesianPos,
                translation,
                translatedPos
              );
            }
            var pos = Cesium.Cartographic.fromCartesian(translatedPos);
            return pos.latitude * Cesium.Math.DEGREES_PER_RADIAN;
          });
          var minLat = Math.min(...lats);
          var maxLat = Math.max(...lats);

          var bbox = [minLon, maxLon, minLat, maxLat, minHeight, maxHeight];

          regions.push({
            fileName: fileName,
            ept: ept,
            polygon: wktPolygon,
            bbox: bbox,
            outside: false,
          });
        }
      }
    });
  });

  if (regions.length > 0) {
    var cropLink = `${processingAPI}/crop?regions=${encodeURIComponent(
      JSON.stringify(regions)
    )}`;

    var tab = window.open(cropLink, "_blank");
    var html = `<html><head></head><body>
    Exporting for download. Please wait...
    <a href="${cropLink}" id="dl"/>
    <script>
      document.getElementById("dl").click();
    </script>
    </body></html>`;
    tab.document.write(html);
    tab.document.close();
  }
};

const displayShareURL = () => {
  document.getElementById("share-question").style.display = "none";
  document.getElementById("share-link").style.display = "block";

  const urlParams = new URLSearchParams(window.location.search);

  var alphas = {};
  selectedDatasets.map((data) => {
    if (
      data.asset.project &&
      !data.id.endsWith("-s") &&
      !urlParams.get("task")
    ) {
      alphas[data.id + "-s"] = getAlpha(data.asset, data);
    } else {
      alphas[data.id] = getAlpha(data.asset, data);
    }
  });

  if (init && init.index) {
    //deep copy
    var index = JSON.parse(JSON.stringify(init.index));

    index.assets = index.assets.filter(
      (a) => !a.data.every((d) => !selectedDatasets.find((sd) => sd.id == d))
    );

    index.categories = index.categories.filter((c) =>
      index.assets.find((a) => a && a.project == c.id)
    );

    index.datasets = index.datasets.filter((d) =>
      selectedDatasets.find((sd) => sd.id == d.id)
    );
  } else {
    if (selectedDatasets.find((d) => d.asset.categoryID == -1)) {
      var index = {
        assets: [],
        datasets: [],
        categories: [],
      };
    }
  }

  var selectedWebODMDatasets = selectedDatasets.filter(
    (d) => d.asset.categoryID == -1 || d.asset.categoryID == -3
  );
  selectedWebODMDatasets.map((d) => {
    var data = { ...d };

    if (!index.datasets.find((indexData) => indexData.id == d.id)) {
      delete data.asset;
      data.id += !data.id.endsWith("-s") ? "-s" : "";

      index.datasets.push(data);
    }

    var asset = { ...d.asset };
    if (!index.assets.find((a) => a.id == d.asset.id)) {
      index.assets.push(asset);
    }
    asset.data.map((data) => {
      var newData = { ...datasets.find((dd) => dd.id == data) };
      delete newData.asset;

      if (!index.datasets.find((dd) => dd.id == newData.id)) {
        newData.id += !newData.id.endsWith("-s") ? "-s" : "";
        index.datasets.push(newData);
      }
    });

    var project =
      odmProjects && odmProjects.find((p) => p.tasks.includes(d.asset.taskID));
    if (project && !index.categories.find((c) => c.id == project.id)) {
      //
      index.categories.push(project);
    }
  });

  index?.assets.map((asset) => {
    delete asset.id;
    asset.categoryID = -3;

    asset.data = asset.data.map((ad) => (!ad.endsWith("-s") ? ad + "-s" : ad));
    delete asset.permissions;
    delete asset.public;
  });

  index?.categories.map((proj) => {
    delete proj.permissions;
  });

  var shareCropBoxes = {};
  var selectedDataIDs = selectedDatasets.map((d) => d.id.toString());
  Object.keys(cropBoxes).map((b) => {
    if (selectedDataIDs.includes(b)) {
      shareCropBoxes[b] = {};
      shareCropBoxes[b].trs = cropBoxes[b].trs;
      shareCropBoxes[b].show = document.getElementById(
        `crop-checkbox-${b}`
      ).checked;
      shareCropBoxes[b].keepBoxAboveGround = cropBoxes[b].keepBoxAboveGround;
      shareCropBoxes[b].direction = document.getElementById(
        `crop-direction-${b}`
      ).value;
    }
  });

  var initParams = {
    camera: {
      position: viewer.camera.positionWC,
      direction: viewer.camera.directionWC,
      up: viewer.camera.upWC,
    },
    currentTime: Cesium.JulianDate.toDate(
      viewer.clock.currentTime
    ).toISOString(),
    selectedDimension: selectedDimension,
    billboard: billboard,
    imageryLayersOrder: viewer.imageryLayers._layers
      .filter((l) => l.data)
      .map((l) => l.data.id),
    zoomOnDataSelect: zoomOnDataSelect,
    timelineOnDataSelect: timelineOnDataSelect,
    MSSE: MSSE,
    timeline: {
      start: Cesium.JulianDate.toDate(
        viewer.timeline._startJulian
      ).toISOString(),
      end: Cesium.JulianDate.toDate(viewer.timeline._endJulian).toISOString(),
    },
    opacity: alphas,
    cropBoxes: shareCropBoxes,
  };

  if (selectedData) {
    if (
      (index && index.datasets.find((d) => d.id == selectedData.id)) ||
      selectedData.asset.categoryID == -1
    ) {
      initParams.cameraSelectedDataID = selectedData.id + "-s";
    } else {
      initParams.cameraSelectedDataID = selectedData.id;
    }
  }

  if (!urlParams.get("task")) {
    initParams.index = index;
  }

  var shareURL =
    window.location.origin +
    "/cesium/Apps/ASDC/" +
    (uploadPage ? "Uploads/" : "") +
    selectedDatasets
      .map((d) => {
        if (d.asset.project && !d.id.endsWith("-s") && !urlParams.get("task")) {
          return d.id + "-s";
        } else {
          return d.id;
        }
      })
      .sort()
      .join("&") +
    "?" +
    (urlParams.get("index") ? "index=" + urlParams.get("index") : "") +
    (urlParams.get("task") ? "&task=" + urlParams.get("task") : "") +
    "#init=" +
    encodeURIComponent(JSON.stringify(initParams));

  var shareInput = document.getElementById("share-input");
  shareInput.value = shareURL;

  var copyBtn = document.getElementById("copy-share-link-button");
  copyBtn.onclick = () => {
    shareInput.select();
    shareInput.setSelectionRange(0, 99999); //mobile?
    navigator.clipboard.writeText(shareURL);
  };
};

const showSharePanel = (loadingTimer) => {
  if (loadingFinished) {
    if (
      !!selectedDatasets.find(
        (d) =>
          d.asset.project &&
          (Object.keys(d.asset).includes("public") ? !d.asset.public : true) &&
          (d.asset.permissions ? d.asset.permissions.includes("change") : true)
      )
    ) {
      document.getElementById("share-question").style.display = "block";
      document.getElementById("share-link").style.display = "none";
      document.getElementById("share-question-text").style.display = "block";
      document.getElementById("share-question-yes").style.display = "block";
      document.getElementById("share-question-no").style.display = "block";
      document.getElementById("share-question-loader").style.display = "none";
    } else {
      displayShareURL();
    }
    clearInterval(loadingTimer);
  }
};

document.getElementById("share-button").onclick = () => {
  const urlParams = new URLSearchParams(window.location.search);

  var shareDropDown = document.getElementById("share-dropdown-list");
  if (shareDropDown.style.display == "block") {
    shareDropDown.style.display = "none";
    if (window.self === window.top) {
      document.getElementById("share-button").style.background = null;
    }
  } else {
    if (uploadPage || urlParams.get("task") || urlParams.get("index")) {
      shareDropDown.style.right = "15px";
    } else {
      shareDropDown.style.right = "60px";
    }
    shareDropDown.style.display = "block";
    if (window.self === window.top) {
      document.getElementById("share-button").style.background = "#5b8b51";
    }
  }

  if (loadingFinished) {
    showSharePanel();
  } else {
    var suffixes = ["pc", "op", "dtm", "dsm"];
    if (
      selectedDataIDs.length > 0 &&
      selectedDataIDs.find((d) =>
        suffixes.includes(d.split("-")[d.split("-").length - 1])
      )
    ) {
      document.getElementById("share-question-text").style.display = "none";
      document.getElementById("share-question-yes").style.display = "none";
      document.getElementById("share-question-no").style.display = "none";
      document.getElementById("share-question-loader").style.display = "block";
      var loadingTimer = setInterval(() => showSharePanel(loadingTimer), 500);
    } else {
      displayShareURL();
    }
  }
};

document.getElementById("share-question-no").onclick = () => {
  displayShareURL();
};

document.getElementById("share-question-yes").onclick = () => {
  document.getElementById("share-question-text").style.display = "none";
  document.getElementById("share-question-yes").style.display = "none";
  document.getElementById("share-question-no").style.display = "none";
  document.getElementById("share-question-loader").style.display = "block";

  var odmSelectedTasks = {};
  selectedDatasets.map((d) => {
    if (
      !!d.asset.taskID &&
      !d.asset.public &&
      (d.asset.permissions ? d.asset.permissions.includes("change") : true)
    ) {
      if (!odmSelectedTasks[d.asset.project]) {
        odmSelectedTasks[d.asset.project] = [d.asset.taskID];
      } else {
        if (!odmSelectedTasks[d.asset.project].includes(d.asset.taskID)) {
          odmSelectedTasks[d.asset.project].push(d.asset.taskID);
        }
      }
    }
  });

  var makePublicPromises = [];
  Object.keys(odmSelectedTasks).map((project) => {
    odmSelectedTasks[project].map((task) => {
      makePublicPromises.push(
        fetch(`/cesium/makeWebODMTaskPublic/${project}/${task}`, {
          method: "PATCH",
          credentials: "include",
        }).then((resp) => {
          if (resp.status == 200) {
            selectedDatasets
              .filter((d) => !d.asset.public)
              .map((d) => {
                d.asset.public = true;
              });
          }
        })
      );
    });
  });
  Promise.all(makePublicPromises).then((responses) => {
    displayShareURL();
  });
};

document.onclick = (e) => {
  if (document.getElementById("user-dropdown-button")) {
    if (
      e.target != document.getElementById("share-button") &&
      e.target != document.getElementById("share-dropdown-list") &&
      e.target != document.getElementById("share-input") &&
      e.target != document.getElementById("copy-share-link-button") &&
      e.target != document.getElementById("share-question-yes") &&
      e.target != document.getElementById("share-question-no") &&
      e.target != document.getElementById("share-question") &&
      e.target != document.getElementById("share-question-buttons") &&
      e.target != document.getElementById("share-question-loader") &&
      e.target != document.getElementById("share-question-text")
    ) {
      document.getElementById("share-dropdown-list").style.display = "none";
      document.getElementById("share-button").style.background = null;
    }

    var userDropdownChildren = [
      ...document.getElementById("user-dropdown-button").children,
    ];
    if (
      !userDropdownChildren.find((c) => c == e.target) &&
      e.target != document.getElementById("user-dropdown-button")
    ) {
      document.getElementById("user-dropdown-list").style.display = "none";
      document.getElementById("user-dropdown-button").style.background = null;
    }
  }

  var checkChildrenForTarget = (elem) => {
    var elemChildren = [...elem.children];
    if (elem == e.target) {
      return true;
    } else {
      return elemChildren.some((c) => {
        return checkChildrenForTarget(c);
      });
    }
  };

  if (
    e.target.id != "export-btn" &&
    !checkChildrenForTarget(document.getElementById("export-modal"))
  ) {
    if (document.getElementById("export-modal").style.display != "none") {
      cropControllers?.eptFileSize?.abort();
      cropControllers?.eptNumPoints?.abort();
      document.getElementById("export-modal").style.display = "none";
    }
  }
};
