import { cesiumIonAccessToken } from "./Constants.js";
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
  setSelectedDatasets,
  setSelectedAssetIDs,
  MSSE,
  imageryLayers,
  controllers,
  lastCurrentTime,
  setLastCurrentTime,
} from "./State.js";
import { loadAsset, loadData, setScreenSpaceError } from "./Datasets.js";
import {
  setupSidebar,
  upload,
  addFileInput,
  openModal,
  closeModal,
} from "./Sidebar.js";
import { closeGraphModal } from "./Graphs.js";
import { findAssetAndDataFromUrl } from "./URL.js";

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
    fullscreenElement: "cesiumContainer",
  })
);
viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
viewer.scene.globe.depthTestAgainstTerrain = false;

var uploadPage;
if (window.location.href.toLowerCase().includes("cesium/apps/asdc/uploads")) {
  uploadPage = true;
} else {
  uploadPage = false;
}

setupSidebar(uploadPage);

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
          if (datasets[i].id === dataID) {
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
                      selectedDatasets.includes(selectedData) &&
                      !checkbox.checked
                    ) {
                      if (
                        tilesets[selectedData.asset.id] &&
                        tilesets[selectedData.asset.id][
                          new Date(selectedData.date)
                        ]
                      ) {
                        if (
                          Array.isArray(
                            tilesets[selectedData.asset.id][
                              new Date(selectedData.date)
                            ]
                          )
                        ) {
                          tilesets[selectedData.asset.id][
                            new Date(selectedData.date)
                          ].map((tileset) => {
                            tileset.show = false;
                          });
                        } else {
                          tilesets[selectedData.asset.id][
                            new Date(selectedData.date)
                          ].show = false;
                        }
                      }
                      if (entities[selectedData.asset.id]) {
                        entities[selectedData.asset.id].show = false;
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
                      console.log(
                        imageryLayers[selectedData.asset.id] &&
                          imageryLayers[selectedData.asset.id][selectedData.id]
                      );
                      setSelectedDatasets(
                        selectedDatasets.filter((d) => {
                          return d.id !== selectedData.id;
                        })
                      );
                      if (
                        !selectedDatasets.find((d) =>
                          selectedAssetIDs.includes(d.asset.id)
                        )
                      ) {
                        setSelectedAssetIDs(
                          selectedAssetIDs.filter((a) => {
                            return a !== data.asset.id;
                          })
                        );
                      }
                    }
                  }

                  loadData(asset, data, false, true, false, true);

                  if (
                    data["type"] === "PointCloud" ||
                    data["type"] === "EPTPointCloud"
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
  var currentTime = Cesium.JulianDate.toDate(clock.currentTime).getTime();
  if (!selectedAssetIDs) return;
  selectedAssetIDs.map((assetID) => {
    if (tilesets[assetID]) {
      var tilesetDates = Object.keys(tilesets[assetID])
        .filter((k) => {
          var selectedAssetDates = selectedDatasets
            .filter(
              (data) =>
                new Date(data.date) != "Invalid Date" &&
                data.asset.id == assetID &&
                (data.type == "PointCloud" || data.type == "EPTPointCloud")
            )
            .map((data) => new Date(data.date));
          return !!selectedAssetDates.find((item) => {
            return item.getTime() == new Date(k).getTime();
          });
        })
        .sort(function (a, b) {
          return new Date(a).getTime() - new Date(b).getTime();
        });

      for (var i = 0; i < tilesetDates.length; i++) {
        if (
          (i === 0 || new Date(tilesetDates[i]).getTime() <= currentTime) &&
          (i === tilesetDates.length - 1 ||
            new Date(tilesetDates[i + 1]).getTime() > currentTime)
        ) {
          if (Array.isArray(tilesets[assetID][tilesetDates[i]])) {
            tilesets[assetID][tilesetDates[i]].map((tileset) => {
              if (MSSE !== 0) {
                tileset.show = true;
              }
            });
          } else {
            if (MSSE !== 0) {
              tilesets[assetID][tilesetDates[i]].show = true;
            }
          }
        } else {
          if (Array.isArray(tilesets[assetID][tilesetDates[i]])) {
            tilesets[assetID][tilesetDates[i]].map((tileset) => {
              tileset.show = false;
            });
          } else {
            tilesets[assetID][tilesetDates[i]].show = false;
          }
        }
      }
    }
  });
  if (
    !lastCurrentTime ||
    Math.abs(
      new Date(lastCurrentTime).getHours() - new Date(currentTime).getHours()
    ) >= 1
  ) {
    setLastCurrentTime(currentTime);
    selectedDatasets.map((data) => {
      if (data.type === "ImageSeries") {
        if (entities[data.asset.id]) {
          if (!controllers[data.asset.id]) {
            controllers[data.asset.id] = new AbortController();
          }
          // else {
          //   controllers[data.asset.id].abort();
          //   controllers[data.asset.id] = new AbortController();
          // }
          fetch(
            `/cesium/influx/images?camera=${data.camera}&time=${
              data.timeOffset ? currentTime + data.timeOffset : currentTime
            }&startTime=${new Date(data.startDateTime).getTime()}`,
            // ,{cache:"no-store", signal:controllers[data.asset.id].signal})
            { cache: "no-store" }
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
                entities[data.asset.id].rectangle.material.image.getValue() !==
                imageUrl
              ) {
                entities[data.asset.id].rectangle.material =
                  new Cesium.ImageMaterialProperty({
                    image: imageUrl,
                    color: entities[data.asset.id].rectangle.material.color,
                  });
              }
            })
            .catch((error) => {
              if (error.name !== "AbortError") {
                console.log(error);
              }
            });
        }
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
          // var catAccordion = document.getElementById(`category-${assets[i].categoryID}`);
          // if (!catAccordion.classList.contains("sidebar-accordion-active")){
          //   catAccordion.classList.toggle("sidebar-accordion-active");
          //   var panel = catAccordion.nextElementSibling;
          //   panel.style.maxHeight = panel.scrollHeight + 1 + "px";
          // }
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
