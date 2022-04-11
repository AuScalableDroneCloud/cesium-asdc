import { cesiumIonAccessToken, eptServer } from "./Constants.js";
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
} from "./State.js";
import { loadAsset, loadData, setScreenSpaceError, fetchIndexAssets,fetchWebODMProjects, fetchPublicTask } from "./Datasets.js";
import {
  setupSidebar,
  upload,
  addFileInput,
  openModal,
  closeModal,
} from "./Sidebar.js";
import { closeGraphModal, loadGraph } from "./Graphs.js";
import { findAssetAndDataFromUrl } from "./URL.js";

// var webAuth = new auth0.WebAuth({
//   domain:       'https://au-scalable-drone-cloud.au.auth0.com/',
//   clientID:     'be8iHLsWn2t6ZsyZh0UofW1oaWScfsfC'
// });

// webAuth.authorize({
//   // redirectUri:"/cesium/Apps/ASDC/",
//   redirectUri:"https://asdc.cloud.edu.au/complete/auth0",
//   responseType: "code"
// });

Cesium.Ion.defaultAccessToken = cesiumIonAccessToken;

window.CESIUM_BASE_URL = "/cesium/Build/Cesium";

findAssetAndDataFromUrl();

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
  113.338953078,
  -43.6345972634,
  153.569469029,
  -10.6681857235
);

setViewer(
  new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain({ requestWaterMask: true }),
    vrButton: true,
    fullscreenElement: "cesiumContainer"
  })
);

viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
viewer.scene.globe.depthTestAgainstTerrain = false;

viewer.animation.viewModel.dateFormatter = (date, viewModel) => {
  const localDate = Cesium.JulianDate.toDate(date);
  return localDate.toLocaleString('en-au', {year: 'numeric', month: 'long', day: 'numeric'} )
};

viewer.animation.viewModel.timeFormatter = (date, viewModel) => {
  const localDate = Cesium.JulianDate.toDate(date);
  return localDate.toLocaleTimeString();
};

Cesium.Timeline.prototype.makeLabel = function (time) {
  const localDate = Cesium.JulianDate.toDate(time);
  return localDate.toLocaleString('en-au', {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'});
};

var uploadPage;
if (window.location.href.toLowerCase().includes("cesium/apps/asdc/uploads")) {
  uploadPage = true;
} else {
  uploadPage = false;
}

Cesium.TrustedServers.add("asdc.cloud.edu.au",443)

if (publicTask) {
  fetchPublicTask().then(()=>{
    setupSidebar(false);
  })
} else {
  fetchIndexAssets().then(()=>{
    setupSidebar(uploadPage);
    if (!uploadPage){
      fetchWebODMProjects()
      .then(()=>{
        setupSidebar(uploadPage);
      })
      .catch(()=>{
        setupSidebar(uploadPage);
      })
    }
  })
}

const handleBillboard = (billboard) => {
  setBillboard(billboard);
  selectedDatasets.map((data) => {
    if (entities[data.asset.id] && entities[data.asset.id][data.id]) {
      entities[data.asset.id][data.id].rectangle.show = !billboard;
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

viewer.camera.moveEnd.addEventListener(() => {
  if (!assets) return;

  var viewMenu = [];

  var selectedIndex;
  var timeseriesInView = false;

  assets.map((asset) => {
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
          if (
            distance <=
            (data.boundingSphereRadius ? data.boundingSphereRadius * 2.5 : 2000)
          ) {
            viewMenu.push({
              text:
                (data.date
                  ? `${asset.name} - ${data.date}`
                  : `${asset.name} - No Date`) +
                (data.name ? " - " + data.name : ""),
              onselect: () => {
                if (data != selectedData) {
                  if (selectedData) {
                    var checkbox = document.getElementById(
                      `dataCheckbox-${selectedData.id}`
                    );
                    if (
                      // selectedDatasets.includes(selectedData) &&
                      !checkbox.checked
                    ) {
                      if (
                        tilesets[selectedData.asset.id] &&
                        tilesets[selectedData.asset.id][
                          selectedData.id
                        ]
                      ) {
                        if (
                          Array.isArray(
                            tilesets[selectedData.asset.id][
                              selectedData.id
                            ]
                          )
                        ) {
                          tilesets[selectedData.asset.id][
                            selectedData.id
                          ].map((tileset) => {
                            tileset.show = false;
                          });
                        } else {
                          tilesets[selectedData.asset.id][
                            selectedData.id
                          ].show = false;
                        }
                      }
                      if (
                        entities[selectedData.asset.id] &&
                        entities[selectedData.asset.id][selectedData.id]
                      ) {
                        entities[selectedData.asset.id][
                          selectedData.id
                        ].show = false;
                      }
                      if (
                        dataSources[selectedData.asset.id] &&
                        dataSources[selectedData.asset.id][selectedData.id]
                      ) {
                        dataSources[selectedData.asset.id][
                          selectedData.id
                        ].show = false;
                      }
                      if (
                        imageryLayers[selectedData.asset.id] &&
                        imageryLayers[selectedData.asset.id][selectedData.id]
                      ) {
                        imageryLayers[selectedData.asset.id][
                          selectedData.id
                        ].show = false;
                      }
                    }
                  }

                  loadData(asset, data, false, true, false, false);

                  if (
                    data["type"] === "PointCloud" ||
                    data["type"] === "EPTPointCloud" ||
                    data["type"] === "ModelTileset"
                  ) {
                    document.getElementById(
                      "msse-slider-container"
                    ).style.display = "block";
                  } else {
                    document.getElementById(
                      "msse-slider-container"
                    ).style.display = "none";
                  }
                }

                setSelectedData(data);
              },
              data: data,
            });
            if (selectedData && selectedData === data) {
              selectedIndex = viewMenu.length - 1;
            }
            if (selectedAssetIDs.includes(asset.id)) {
              timeseriesInView = true;
            }
          }
        }
      });
    }
  });

  var toolbar = document.getElementById("cam-toolbar");

  while (toolbar.firstChild) {
    toolbar.removeChild(toolbar.firstChild);
  }

  if (viewMenu.length > 0) {
    Sandcastle.addToolbarMenu(viewMenu, "cam-toolbar");
    // if (selectedIndex && !timeseriesInView) {
    if (selectedIndex) {
      document.getElementById("cam-toolbar").childNodes[0].selectedIndex =
        selectedIndex;

      if (selectedData && selectedData != viewMenu[selectedIndex].data) {
        viewMenu[selectedIndex].onselect();
      }
    } else {
      if (!timeseriesInView) {
        viewMenu[0].onselect();
      }
    }
  }
});

viewer.clock.onTick.addEventListener((clock) => {
  var currentDate = Cesium.JulianDate.toDate(clock.currentTime);
  selectedAssetIDs.map((assetID) => {
    var timelineAssetDatasets = selectedDatasets
      .filter(
        (data) =>
          new Date(data.date) != "Invalid Date" &&
          data.asset.id == assetID &&
          (data.type == "PointCloud" ||
            data.type == "EPTPointCloud" ||
            data.type === "ModelTileset")
      )

    timelineAssetDatasets
    .sort(function (a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });


    for (var i = 0; i < timelineAssetDatasets.length; i++) {
      if (
        (i === 0 ||
          new Date(timelineAssetDatasets[i].date).getTime() <= currentDate.getTime()) &&
        (i === timelineAssetDatasets.length - 1 ||
          new Date(timelineAssetDatasets[i + 1].date).getTime() > currentDate.getTime())
      ) {
        if (Array.isArray(tilesets[assetID][timelineAssetDatasets[i].id])) {
          if(tilesets[assetID][timelineAssetDatasets[i].id]){
            tilesets[assetID][timelineAssetDatasets[i].id].map((tileset) => {
              if (MSSE !== 0) {
                if (tileset){
                  tileset.show = true;
                }
              }
            });
          }
        } else {
          if (MSSE !== 0) {
            if(tilesets[assetID][timelineAssetDatasets[i].id]){
              if(tilesets[assetID][timelineAssetDatasets[i].id]){
                tilesets[assetID][timelineAssetDatasets[i].id].show = true;
              }
            }
          }
        }
      } else {
        if (Array.isArray(tilesets[assetID][timelineAssetDatasets[i].id])) {
          if (tilesets[assetID][timelineAssetDatasets[i].id]){
            tilesets[assetID][timelineAssetDatasets[i].id].map((tileset) => {
              if (tileset){
                tileset.show = false;
              }
            });
          }
        } else {
          if (tilesets[assetID][timelineAssetDatasets[i].id]){
            tilesets[assetID][timelineAssetDatasets[i].id].show = false;
          }
        }
      }
    }
  })
    
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
                entities[data.asset.id][
                  data.id
                ].rectangle.material.image.getValue() !== imageUrl
              ) {
                entities[data.asset.id][data.id].rectangle.material =
                  new Cesium.ImageMaterialProperty({
                    image: imageUrl,
                    color:
                      entities[data.asset.id][data.id].rectangle.material.color,
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
      if (data.type == "Influx") {
        loadGraph(data);
      }
    });
  }
});

var clickHandler = viewer.screenSpaceEventHandler.getInputAction(
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
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
              ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
              : `/cesium/Apps/ASDC/${dataIDs}`
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
