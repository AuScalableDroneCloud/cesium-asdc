import {
  markersDataSource,
  setMarkersDataSource,
  pinBuilder,
  assets,
  setAssets,
  viewer,
  datasets,
  setDatasets,
  timelineTracks,
  selectedDataIDs,
  setSelectedDatasets,
  setSelectedAssetIDs,
  selectedDatasets,
  tilesets,
  dataSources,
  entities,
  selectedAssetIDs,
  imageryLayers,
  categories,
  odmProjects,
  assetDivs,
  sourceDivs,
  projectDivs,
  categoryDivs,
  publicTask,
  taskInfos,
  initVars,
  init,
  sharedDivs,
  timelineOnDataSelect,
  cropBoxes,
  cropControllers,
  cropRectangles,
  cropPolygons,
  setSelectedDimension,
  selectedDimension,
  setLoadingFinished,
} from "./State.js";
import {
  loadAsset,
  loadData,
  syncTimeline,
  fetchWebODMProjects,
} from "./Datasets.js";
import { pcFormats, processingAPI } from "./Constants.js";
import { closeGraphModal } from "./Graphs.js";
import {
  applyAlpha,
  getAlpha,
  applyStyle,
  setupStyleToolbar,
} from "./Style.js";
import { cropBox } from "./CropBox.js";
import { cropRectangle } from "./CropRectangle.js";
import { cropBox2D } from "./CropBox2D.js";
import { cropRectangle2D } from "./CropRectangle2D.js";

export const setupSidebar = (uploads, indexParam = false) => {
  if (!assets) return;
  var sidebarDataButtons = document.getElementById("sidebar-data-buttons");

  createMarkersDataSource();
  var togglePublicData = false;
  if (!uploads && !publicTask && !indexParam) {
    if (Object.keys(sourceDivs).length == 0) {
      var sources = ["Public Data", "WebODM Projects"];

      var sharedODMAssetsExist = false;
      if (
        init &&
        init.index &&
        init.index.categories &&
        init.index.categories.length
      ) {
        sources.push("Shared WebODM Datasets");
        sharedODMAssetsExist = true;
      }
      sources.map((s) => {
        sourceDivs[s] = createAccordion(s);
        sourceDivs[s].id = `source-${s}`;
        var sourceAccordionPanelDiv = document.createElement("div");
        sourceAccordionPanelDiv.className = "sidebar-accordion-panel";

        var loaderParent = document.createElement("div");
        loaderParent.className = "loader-parent";
        var loader = document.createElement("div");
        loader.className = "loader";
        loaderParent.appendChild(loader);
        sourceAccordionPanelDiv.appendChild(loaderParent);

        sidebarDataButtons.appendChild(sourceDivs[s]);
        sidebarDataButtons.appendChild(sourceAccordionPanelDiv);
      });
      togglePublicData = true;
      categories.map((cat) => {
        categoryDivs[cat.id] = createAccordion(cat.name, 18);
        categoryDivs[cat.id].id = `category-${cat.id}`;
        //Uploads page
        if ((!uploads && cat.id !== 6) || (uploads && cat.id == 6)) {
          sourceDivs["Public Data"].nextElementSibling.appendChild(
            categoryDivs[cat.id]
          );
          var accordionPanelDiv = document.createElement("div");
          accordionPanelDiv.className = "sidebar-accordion-panel";
          sourceDivs["Public Data"].nextElementSibling.appendChild(
            accordionPanelDiv
          );
        }
      });
    }
  } else {
    categories.map((cat) => {
      if ((uploads && cat.id == 6) || publicTask || indexParam) {
        categoryDivs[cat.id] = createAccordion(cat.name, 18);
        categoryDivs[cat.id].id = `category-${cat.id}`;
        sidebarDataButtons.appendChild(categoryDivs[cat.id]);
        var accordionPanelDiv = document.createElement("div");
        accordionPanelDiv.className = "sidebar-accordion-panel";
        sidebarDataButtons.appendChild(accordionPanelDiv);
      }
    });
  }

  if (sharedODMAssetsExist) {
    init.index.categories.map((c) => {
      sharedDivs[c.id] = createAccordion(c.name, 18);
      sharedDivs[c.id].id = `shared-${c.id}`;
      sourceDivs["Shared WebODM Datasets"].nextElementSibling.appendChild(
        sharedDivs[c.id]
      );
      var accordionPanelDiv = document.createElement("div");
      accordionPanelDiv.className = "sidebar-accordion-panel";
      sourceDivs["Shared WebODM Datasets"].nextElementSibling.appendChild(
        accordionPanelDiv
      );
    });
  }
  if (!uploads && Array.isArray(odmProjects)) {
    odmProjects.map((odmProject) => {
      if (projectDivs[odmProject.id]) return;
      projectDivs[odmProject.id] = createAccordion(odmProject.name, 18);
      projectDivs[odmProject.id].id = `project-${odmProject.id}`;

      const oldProjectClick = projectDivs[odmProject.id].onclick;
      projectDivs[odmProject.id].onclick = () => {
        oldProjectClick();
        var projectAssets = assets.filter(
          (a) => a.project == odmProject.id && a.categoryID == -1
        );
        projectAssets.map((asset) => {
          var assetDatasets = [];
          asset?.data?.map((dataID, index) => {
            for (var i = 0; i < datasets.length; i++) {
              if (datasets[i].id == dataID) {
                assetDatasets.push(datasets[i]);
              }
            }
          });

          if (
            projectDivs[odmProject.id].firstChild.classList.contains(
              "sidebar-accordion-active"
            )
          ) {
            var data = assetDatasets[0];

            var position = Cesium.Cartesian3.fromDegrees(
              data["position"]["lng"],
              data["position"]["lat"]
            );

            markersDataSource.entities.add({
              position: position,
              billboard: {
                image: pinBuilder
                  .fromColor(Cesium.Color.fromCssColorString("#5B8B51"), 48)
                  .toDataURL(),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  data.boundingSphereRadius
                    ? data.boundingSphereRadius * 4
                    : 2500,
                  Number.MAX_VALUE
                ),
              },
              id: "marker_" + asset.id,
            });
          } else {
            markersDataSource.entities.removeById("marker_" + asset.id);
          }
        });
        // setTimeout(() => {
        //   markersDataSource.clustering.pixelRange = 0;
        // }, 0);
      };
      var projectAssets = assets.filter((a) => a.project == odmProject.id);
      var projectOpacityBtn = createProjectOpacitySliderBtn(
        projectAssets,
        projectDivs[odmProject.id]
      );
      projectDivs[odmProject.id].firstChild.appendChild(projectOpacityBtn);

      var sourcePanelDiv = sourceDivs["WebODM Projects"].nextElementSibling;
      sourcePanelDiv.appendChild(projectDivs[odmProject.id]);

      var projectsPanelDiv = document.createElement("div");
      projectsPanelDiv.className = "sidebar-accordion-panel";
      sourcePanelDiv.appendChild(projectsPanelDiv);

      var projectTasks = assets.filter((a) => a.project === odmProject.id);
      var suffixes = ["pc", "op", "dtm", "dsm"];

      suffixes.map((suffix) => {
        if (
          !!projectTasks.find((p) =>
            p.data.find((d) => d.endsWith("-" + suffix))
          )
        ) {
          var layerDiv = document.createElement("div");
          layerDiv.className = "sidebar-item";
          var layerContentDiv = document.createElement("div");
          layerContentDiv.style.padding = "0 54px";
          layerContentDiv.innerHTML =
            "All " +
            (suffix == "pc"
              ? "Point Clouds"
              : suffix == "op"
              ? "Orthophotos"
              : suffix == "dtm"
              ? "DTMs"
              : suffix == "dsm"
              ? "DSMs"
              : null);

          var layerCheckBox = document.createElement("input");
          layerCheckBox.type = "checkbox";
          layerCheckBox.id = `layerCheckbox-${odmProject.id}-${suffix}`;
          layerCheckBox.style.float = "left";
          layerCheckBox.style.margin = "0 5px 0 0";
          var projectLayerDataIDs = [];
          projectTasks.map((asset) => {
            asset.data.map((dataID) => {
              if (dataID.endsWith("-" + suffix)) {
                projectLayerDataIDs.push(dataID);
              }
            });
          });
          layerCheckBox.checked = projectLayerDataIDs.every((id) =>
            selectedDataIDs.includes(id)
          );
          layerContentDiv.appendChild(layerCheckBox);
          layerDiv.appendChild(layerContentDiv);

          layerDiv.onclick = (e) => {
            if (e && e.target == layerCheckBox) return;
            projectTasks.map((asset) => {
              asset.data.map((dataID) => {
                if (dataID.endsWith("-" + suffix)) {
                  var data = datasets.find(
                    (d) => d.id === dataID && d.asset.categoryID != -3
                  );
                  layerCheckBox.checked = true;
                  document.getElementById(`dataButton-${data.id}`).onclick();
                }
              });
            });
          };

          layerCheckBox.onchange = (e) => {
            if (e && e.target != layerCheckBox) return;
            if (layerCheckBox.checked) {
              layerDiv.onclick();
            } else {
              projectTasks.map((asset) => {
                asset.data.map((dataID) => {
                  if (dataID.endsWith("-" + suffix)) {
                    var data = datasets.find(
                      (d) => d.id === dataID && d.asset.categoryID != -3
                    );
                    var checkbox = sourceDivs[
                      "WebODM Projects"
                    ].nextElementSibling.querySelector(
                      `#dataCheckbox-${data.id}`
                    );
                    checkbox.checked = false;
                    checkbox.onchange();
                  }
                });
              });
            }
          };

          projectsPanelDiv.appendChild(layerDiv);
        }
      });
    });
    if (
      sourceDivs["WebODM Projects"].nextElementSibling.firstChild.className ===
      "loader-parent"
    ) {
      sourceDivs[
        "WebODM Projects"
      ].nextElementSibling.firstChild.style.display = "none";
    }
    if (sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight) {
      var height = 0;
      var children = [
        ...sourceDivs["WebODM Projects"].nextElementSibling.children,
      ];
      for (var i = 0; i < children.length; i++) {
        if (children[i].style.maxHeight) {
          height += parseFloat(children[i].style.maxHeight.slice(0, -2));
        } else {
          height +=
            children[i].scrollHeight +
            children[i].getBoundingClientRect().height;
        }
      }
      sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight =
        height + "px";
    }
  }

  assets.map((asset) => {
    if (!!assetDivs[asset.id]) return;
    if (!uploads && asset.categoryID == 6) return;
    if (uploads && asset.categoryID != 6) return;

    if (asset.categoryID == -1) {
      var accordionDiv = projectDivs[asset.project];
      var accordionPanelDiv = projectDivs[asset.project].nextElementSibling;
    } else if (asset.categoryID == -3) {
      var accordionDiv = sharedDivs[asset.project];
      var accordionPanelDiv = sharedDivs[asset.project].nextElementSibling;
    } else {
      var accordionDiv = categoryDivs[asset.categoryID];
      var accordionPanelDiv = accordionDiv.nextElementSibling;

      if (
        !uploads &&
        !publicTask &&
        !indexParam &&
        sourceDivs["Public Data"].nextElementSibling.firstChild.className ===
          "loader-parent"
      ) {
        sourceDivs["Public Data"].nextElementSibling.removeChild(
          sourceDivs["Public Data"].nextElementSibling.firstChild
        );

        if (sourceDivs["Shared WebODM Datasets"]) {
          sourceDivs["Shared WebODM Datasets"].nextElementSibling.removeChild(
            sourceDivs["Shared WebODM Datasets"].nextElementSibling.firstChild
          );
        }
      }
    }

    var datesPanelDiv = document.createElement("div");
    datesPanelDiv.className = "sidebar-accordion-panel";

    if (asset.categoryID == -1 || asset.categoryID == -2) {
      var metadataDiv = document.createElement("div");
      metadataDiv.className = "sidebar-text";
      var taskInfo = taskInfos[asset.taskID];
      metadataDiv.innerHTML = `<table>
      <tr><td><strong> Created on: </strong></td><td>${new Date(
        taskInfo.created_at
      ).toLocaleString("en-au", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      })}</td></tr>
      ${
        taskInfo.processing_node_name
          ? `<tr><td><strong>Processing Node: </strong></td><td>${taskInfo.processing_node_name}</td></tr>`
          : ""
      }
      ${
        taskInfo.options && Array.isArray(taskInfo.options)
          ? `<tr><td><strong>Options: </strong></td><td>${taskInfo.options.map(
              (o) => `${o.name} : ${o.value}`
            )}</td></tr>`
          : ""
      }
      ${
        taskInfo.statistics && taskInfo.statistics.gsd
          ? `<tr><td><strong>Average GSD: </strong></td><td>${
              Math.round(taskInfo.statistics.gsd * 100) / 100
            } cm</td></tr>`
          : ""
      }
      ${
        taskInfo.statistics && taskInfo.statistics.area
          ? `<tr><td><strong>Area: </strong></td><td>${
              Math.round(taskInfo.statistics.area * 100) / 100
            } m²</td></tr>`
          : ""
      }
      ${
        taskInfo.statistics &&
        taskInfo.statistics.pointcloud &&
        taskInfo.statistics.pointcloud.points
          ? `<tr><td><strong>Reconstructed Points: </strong></td><td>${taskInfo.statistics.pointcloud.points}</td></tr>`
          : ""
      }
      </table>
      `;
      datesPanelDiv.appendChild(metadataDiv);
    }

    var assetDiv = createAssetDiv(asset, uploads, datesPanelDiv);

    accordionPanelDiv.appendChild(assetDiv);
    accordionPanelDiv.appendChild(datesPanelDiv);

    assetDivs[asset.id] = assetDiv;

    var assetDatasets = [];
    asset?.data?.map((dataID, index) => {
      for (var i = 0; i < datasets.length; i++) {
        if (datasets[i].id == dataID) {
          assetDatasets.push(datasets[i]);
        }
      }
    });
    //markers
    if (assetDatasets && assetDatasets.length > 0) {
      assetDatasets.sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      if (assetDatasets[0].position) {
        var data = assetDatasets[0];

        var position = Cesium.Cartesian3.fromDegrees(
          data["position"]["lng"],
          data["position"]["lat"]
        );

        if (asset.categoryID != -1) {
          markersDataSource.entities.add({
            position: position,
            billboard: {
              image: pinBuilder
                .fromColor(Cesium.Color.fromCssColorString("#5B8B51"), 48)
                .toDataURL(),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                data.boundingSphereRadius
                  ? data.boundingSphereRadius * 4
                  : 2500,
                Number.MAX_VALUE
              ),
            },
            id: "marker_" + asset.id,
          });
        }
      }
      // else {
      //   console.log(assetDatasets[0]);
      // }
    }
  });

  markersDataSource.clustering.clusterEvent.addEventListener(function (
    clusteredEntities,
    cluster
  ) {
    cluster.billboard.id = clusteredEntities[0];
  });

  if (!viewer.dataSources.contains(markersDataSource)) {
    viewer.dataSources.add(markersDataSource);

    setTimeout(() => {
      markersDataSource.clustering.pixelRange = 0;
    }, 0);
  }

  if (togglePublicData) {
    sourceDivs["Public Data"].onclick();
  }
};

export const loadSelectedDataIDs = (fly) => {
  if (selectedDataIDs && selectedDataIDs.length != 0) {
    var assetIDs = [];
    var selectedCats = [];
    var selectedProjects = [];
    var newSelectedDatasets = [...selectedDatasets];
    var sharedProjects = [];

    selectedDataIDs.map((dataID, index) => {
      if (selectedDatasets.find((d) => d.id == dataID)) return;

      var asset;
      for (var i = 0; i < assets.length; i++) {
        if (
          assets[i].data &&
          !!assets[i].data.find((d) => d.toString() == dataID)
        ) {
          asset = assets[i];
          break;
        }
      }
      if (asset) {
        var data;
        for (var i = 0; i < datasets.length; i++) {
          if (datasets[i].id == dataID) {
            data = datasets[i];
            break;
          }
        }

        if (data) {
          if (
            (tilesets[data.asset.id] && tilesets[data.asset.id][data.id]) ||
            (imageryLayers[data.asset.id] &&
              imageryLayers[data.asset.id][data.id]) ||
            (dataSources[data.asset.id] && dataSources[data.asset.id][data.id])
          )
            return;

          var dataCheckbox = document.getElementById(`dataCheckbox-${dataID}`);
          if (dataCheckbox) {
            dataCheckbox.checked = true;
          }

          newSelectedDatasets.push(datasets[i]);
          loadData(asset, datasets[i], fly && index == 0, false, true);

          if (index == 0) {
            if (datasets[i].styleDimension) {
              setSelectedDimension(datasets[i].styleDimension);
            } else {
              setSelectedDimension(null);
            }
            if (tilesets[data.asset.id] && tilesets[data.asset.id][data.id]) {
              setupStyleToolbar(tilesets[data.asset.id][data.id]);
            } else {
              var checkTilesetTimer = setInterval(checkTilesetToStyle, 500);
              function checkTilesetToStyle() {
                if (
                  tilesets[data.asset.id] &&
                  tilesets[data.asset.id][data.id]
                ) {
                  if (tilesets[data.asset.id][data.id].ready) {
                    applyStyle(selectedDimension);
                    setupStyleToolbar(tilesets[data.asset.id][data.id]);
                    clearInterval(checkTilesetTimer);
                  }
                }
              }
            }
          }

          if (!assetIDs.includes(asset["id"])) {
            assetIDs.push(asset["id"]);
          }
          if (!selectedCats.includes(asset.categoryID)) {
            selectedCats.push(asset.categoryID);
          }

          if (asset.categoryID == -1) {
            if (!selectedProjects.includes(asset.project)) {
              selectedProjects.push(asset.project);
            }
          }

          if (asset.categoryID == -3) {
            if (!sharedProjects.includes(asset.project)) {
              sharedProjects.push(asset.project);
            }
          }

          var assetCheckbox = document.getElementById(
            `assetCheckbox-${asset.id}`
          );
          if (
            asset.data.every(
              (ad) =>
                selectedDataIDs.includes(ad.toString()) ||
                selectedDataIDs.includes(ad)
            )
          ) {
            assetCheckbox.checked = true;
            assetCheckbox.indeterminate = false;
          } else {
            assetCheckbox.checked = false;
            if (
              asset.data.some(
                (ad) =>
                  selectedDataIDs.includes(ad.toString()) ||
                  selectedDataIDs.includes(ad)
              )
            ) {
              assetCheckbox.indeterminate = true;
            } else {
              assetCheckbox.indeterminate = false;
            }
          }
        }
      }
    });

    selectedCats.map((c) => {
      if (c != -1 && c != -3) {
        if (
          !categoryDivs[c].firstChild.classList.contains(
            "sidebar-accordion-active"
          )
        ) {
          categoryDivs[c].onclick();
        }
      } else {
        var sourceDiv;
        if (c == -1) {
          sourceDiv = sourceDivs["WebODM Projects"];
        } else if (c == -3) {
          sourceDiv = sourceDivs["Shared WebODM Datasets"];
        }
        sourceDiv.firstChild.classList.add("sidebar-accordion-active");
        var panel = sourceDiv.nextElementSibling;
        panel.style.maxHeight = "fit-content";
        var height = 0;
        var children = [...panel.children];
        for (var i = 0; i < children.length; i++) {
          height +=
            children[i].scrollHeight +
            children[i].getBoundingClientRect().height;
        }

        panel.style.maxHeight = height + "px";

        var elem = panel.parentElement;
        while (elem) {
          var height = 0;
          var children = [...elem.children];
          for (var i = 0; i < children.length; i++) {
            if (children[i].style.maxHeight) {
              height += parseFloat(children[i].style.maxHeight.slice(0, -2));
            } else {
              height +=
                children[i].scrollHeight +
                children[i].getBoundingClientRect().height;
            }
          }
          elem.style.maxHeight = height + "px";

          elem = elem.parentElement;
        }
      }
    });

    selectedProjects.map((p) => {
      projectDivs[p].onclick();
    });

    sharedProjects.map((p) => {
      if (
        !sharedDivs[p].firstChild.classList.contains("sidebar-accordion-active")
      ) {
        sharedDivs[p].onclick();
      }
    });

    assetIDs.map((a) => {
      if (
        !assetDivs[a].firstChild.classList.contains("sidebar-accordion-active")
      ) {
        assetDivs[a].onclick();
      }
    });

    setSelectedDatasets(newSelectedDatasets);
    if (timelineOnDataSelect) {
      syncTimeline(true);
    }

    setSelectedAssetIDs(assetIDs);
  }
};

export const downloadFile = (asset, data, index, format) => {
  var waitModal = document.getElementById("processing-wait-modal");

  if (pcFormats.includes(format)) {
    if (
      data.source.url.startsWith("s3://") ||
      !data.source.url.endsWith("." + format)
    ) {
      waitModal.style.display = "block";
      var params = {
        url: data.source.url,
        format: format,
      };

      var link = document.createElement("a");
      var url = new URL(`${processingAPI}/download`);
      url.search = new URLSearchParams(params);
      link.href = url;
      link.click();
      link.remove();

      var cookieTimer = setInterval(checkCookies, 500);
      function checkCookies() {
        if (document.cookie) {
          var cookies = document.cookie
            .split(";")
            .map((v) => v.split("="))
            .reduce((acc, v) => {
              if (v[0] && v[1]) {
                acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(
                  v[1].trim()
                );
              }
              return acc;
            }, {});
          if (cookies[data.source.url + `_${format}`]) {
            waitModal.style.display = "none";
            document.cookie =
              data.source.url +
              `_${format}` +
              "= ; Path=/ ; expires = " +
              new Date().toUTCString();
            clearInterval(cookieTimer);
          }
        }
      }
    } else {
      var link = document.createElement("a");
      link.href = data.source.url;
      link.target = "_blank";
      link.click();
      link.remove();
    }
  } else if (data.type === "GeoJSON") {
    if (data.url.endsWith(".geojson") || data.url.endsWith(".json")) {
      var link = document.createElement("a");
      link.href = data.url;
      link.target = "_blank";
      link.click();
      link.remove();
    }
  } else if (data.type === "Model") {
    if (!Array.isArray(data.source)) {
      var link = document.createElement("a");
      link.href = data.source.url;
      link.target = "_blank";
      link.click();
      link.remove();
    } else {
      waitModal.style.display = "block";
      var params = {
        assetID: asset.id,
        dataID: data.id,
        format: "zip",
      };
      var link = document.createElement("a");
      var url = new URL(`${processingAPI}/download`);
      url.search = new URLSearchParams(params);
      link.href = url;
      link.click();
      link.remove();

      var cookieTimer = setInterval(checkCookies, 500);
      function checkCookies() {
        if (document.cookie) {
          var cookies = document.cookie
            .split(";")
            .map((v) => v.split("="))
            .reduce((acc, v) => {
              if (v[0] && v[1]) {
                acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(
                  v[1].trim()
                );
              }
              return acc;
            }, {});
          if (cookies[data.source[0].url + `_zip`]) {
            waitModal.style.display = "none";
            document.cookie =
              data.source[0].url +
              `_zip` +
              "= ; Path=/ ; expires = " +
              new Date().toUTCString();
            clearInterval(cookieTimer);
          }
        }
      }
    }
  } else if (data.type === "Influx") {
    waitModal.style.display = "block";
    fetch(
      `/cesium/influx/fivemin?station=${
        data.station
      }&time=${Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime()}`,
      {
        cache: "no-store",
      }
    )
      .then((response) => response.json())
      .then((parsedResponse) => {
        fetch(
          `/cesium/influx/daily?station=${
            data.station
          }&time=${Cesium.JulianDate.toDate(
            viewer.clock.currentTime
          ).getTime()}`,
          {
            cache: "no-store",
          }
        )
          .then((dailyresponse) => dailyresponse.json())
          .then((parsedDailyresponse) => {
            waitModal.style.display = "none";
            var outJson = {
              fivemin: parsedResponse,
              daily: parsedDailyresponse,
            };
            const blob = new Blob([JSON.stringify(outJson)]);
            const url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = `Influx_${data.station}_2w.json`;
            waitModal.style.display = "none";
            link.click();
            URL.revokeObjectURL(url);
            link.remove();
          })
          .catch((err) => {
            alert(err);
            waitModal.style.display = "none";
          });
      })
      .catch((err) => {
        alert(err);
        waitModal.style.display = "none";
      });
  } else if (data.type === "Imagery") {
    var link = document.createElement("a");
    link.href = data.source.url;
    link.target = "_blank";
    link.click();
    link.remove();
  }
};

export const addFileInput = () => {
  var uploadForm = document.getElementById("upload-form");

  var lineDiv = document.createElement("div");
  lineDiv.className = "input-line";

  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.name = "files[]";
  fileInput.accept = ".laz,.las";
  fileInput.required = true;

  lineDiv.appendChild(fileInput);

  var dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.name = "dates[]";
  dateInput.required = true;

  lineDiv.appendChild(dateInput);

  var removeButton = document.createElement("input");
  removeButton.type = "button";
  removeButton.value = "x";
  removeButton.onclick = function () {
    lineDiv.remove();
  };
  lineDiv.appendChild(removeButton);

  uploadForm.appendChild(lineDiv);
};

export const upload = () => {
  var xmlHttpRequest = new XMLHttpRequest();
  var form = document.forms.namedItem("upload-form");

  for (var i = 0; i < form.elements.length; i++) {
    if (
      form.elements[i].value === "" &&
      form.elements[i].hasAttribute("required")
    ) {
      alert("Please complete all required fields");
      return;
    }
  }

  if (Array.isArray(form.elements["files[]"])) {
    form.elements["files[]"].map((file) => {
      if (
        !file.files[0].name.toLowerCase().endsWith(".laz") &&
        !file.files[0].name.toLowerCase().endsWith(".las")
      ) {
        alert("Only .laz and .las files are accepted");
        return;
      }
    });
  } else {
    if (
      !form.elements["files[]"].files[0].name.toLowerCase().endsWith(".laz") &&
      !form.elements["files[]"].files[0].name.toLowerCase().endsWith(".las")
    ) {
      alert("Only .laz and .las files are accepted");
      return;
    }
  }

  var formData = new FormData(form);

  document.getElementById("modal-upload-button").innerHTML = "Uploading...";
  document.getElementById("modal-upload-button").style.pointerEvents = "none";

  xmlHttpRequest.addEventListener("loadend", (progress) => {
    document.getElementById("modal-upload-button").innerHTML = "Upload";
    document.getElementById("modal-upload-button").style.pointerEvents = "auto";
    console.log(progress);
  });

  xmlHttpRequest.open("POST", `${processingAPI}/upload`, true);

  xmlHttpRequest.onreadystatechange = function () {
    if (xmlHttpRequest.readyState === 4) {
      if (xmlHttpRequest.status === 200) {
        setupSidebar();
        closeModal();
      } else {
        alert(
          "Error " + xmlHttpRequest.status + " : " + xmlHttpRequest.response
        );
      }
    }
  };

  xmlHttpRequest.send(formData);
};

export const openModal = () => {
  document.getElementById("upload-modal").style.display = "block";
};

export const closeModal = () => {
  document.getElementById("upload-modal").style.display = "none";
};

const createAccordion = (name, padding = 0) => {
  var accordionDiv = document.createElement("div");
  accordionDiv.className = "sidebar-item";

  var accordionContentDiv = document.createElement("div");
  accordionContentDiv.style.padding = `0 ${padding}px`;
  accordionContentDiv.style.display = "flex";
  accordionContentDiv.className = "sidebar-accordion";

  var accordionContentDivText = document.createElement("div");
  accordionContentDivText.innerHTML = name;
  accordionContentDivText.style["flex-grow"] = 1;
  accordionContentDivText.style["overflow"] = "hidden";
  accordionContentDivText.style["text-overflow"] = "ellipsis";
  accordionContentDivText.style["overflow-wrap"] = "break-word";

  accordionContentDiv.appendChild(accordionContentDivText);
  accordionDiv.appendChild(accordionContentDiv);

  accordionDiv.onclick = (e) => {
    if (e && e.target.nodeName == "INPUT") return;
    accordionContentDiv.classList.toggle("sidebar-accordion-active");
    var panel = accordionDiv.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      // panel.style.maxHeight = "fit-content";
      var height = 0;
      var children = [...panel.children];
      for (var i = 0; i < children.length; i++) {
        height +=
          children[i].scrollHeight + children[i].getBoundingClientRect().height;
      }

      panel.style.maxHeight = height + "px";
    }

    var elem = panel.parentElement;
    while (elem && elem.id != "sidebar" && elem.id != "sidebar-data-buttons") {
      // elem.style.maxHeight = 'fit-content';

      var height = 0;
      var children = [...elem.children];
      for (var i = 0; i < children.length; i++) {
        if (children[i].style.maxHeight) {
          height += parseFloat(children[i].style.maxHeight.slice(0, -2));
        } else {
          height +=
            children[i].scrollHeight +
            children[i].getBoundingClientRect().height;
        }
      }
      elem.style.maxHeight = height + "px";

      elem = elem.parentElement;
    }
  };
  return accordionDiv;
};

const handleDataCheckboxChange = (
  checkbox,
  assetCheckbox,
  checkboxes,
  asset,
  data,
  uploads
) => {
  assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
  assetCheckbox.indeterminate =
    !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);

  if (asset.project) {
    var suffix = data.id.split("-")[data.id.split("-").length - 1];
    var layerCheckBox = document.getElementById(
      `layerCheckbox-${asset.project}-${suffix}`
    );
    if (layerCheckBox) {
      var projectLayerDataIDs = [];
      asset.data.map((dataID) => {
        if (dataID.endsWith("-" + suffix)) {
          projectLayerDataIDs.push(dataID);
        }
      });
    }
  }

  if (checkbox.checked) {
    if (!selectedDatasets.includes(data)) {
      selectedDatasets.push(data);
    }
    var newDataIDs = [];
    selectedDatasets.map((d) => {
      newDataIDs.push(d.id);
    });

    newDataIDs.sort((a, b) => a - b);

    var dataIDs = newDataIDs.join("&");

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
            window.location.search +
            window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` +
            window.location.search +
            window.location.hash
    );

    loadData(asset, data, true, false, true);

    if (data.styleDimension) {
      setSelectedDimension(data.styleDimension);
    } else {
      setSelectedDimension(null);
    }
    applyStyle(selectedDimension);
    if (tilesets[asset.id] && tilesets[asset.id][data.id]) {
      setupStyleToolbar(tilesets[asset.id][data.id]);
    }

    if (new Date(data.date) != "Invalid Date") {
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
        new Date(data.date)
      );
    }
  } else {
    if (tilesets[asset.id] && tilesets[asset.id][data.id]) {
      if (Array.isArray(tilesets[asset.id][data.id])) {
        tilesets[asset.id][data.id].map((tileset) => {
          tileset.show = false;
        });
      } else {
        tilesets[asset.id][data.id].show = false;
      }
    }
    if (dataSources[asset.id] && dataSources[asset.id][data.id]) {
      dataSources[asset.id][data.id].show = false;
    }
    if (entities[asset.id] && entities[asset.id][data.id]) {
      entities[asset.id][data.id].show = false;
    }
    if (imageryLayers[asset.id] && imageryLayers[asset.id][data.id]) {
      imageryLayers[asset.id][data.id].show = false;
    }
    if (data["type"] == "Influx" || data["type"] == "CSV") {
      var container = document.getElementById("graphs-container");

      const children = [...container.children];
      for (var i = 0; i < children.length; i++) {
        if (children[i].id.startsWith(`graph_${data.id}`)) {
          container.removeChild(children[i]);
        }
      }
    }

    if (data["type"] == "ImageSeries") {
      document.getElementById("image-series-toolbar-row").style.display =
        "none";
    }
    setSelectedDatasets(
      selectedDatasets.filter((d) => {
        return d.id !== data.id;
      })
    );

    if (!selectedDatasets.find((d) => selectedAssetIDs.includes(d.asset.id))) {
      setSelectedAssetIDs(
        selectedAssetIDs.filter((a) => {
          return a !== data.asset.id;
        })
      );
    }

    if (!selectedDatasets.find((d) => d.type == "Influx" || d.type == "CSV")) {
      closeGraphModal();
    }

    // if (!selectedDatasets.find(d=>d.type==="ImageSeries")){
    //   document.getElementById("image-series-toolbar").style.display="none";
    // }

    // var dataIDs = "";
    var newDataIDs = [];
    selectedDatasets.map((d) => {
      newDataIDs.push(d.id);
    });

    newDataIDs.sort((a, b) => a - b);

    var dataIDs = newDataIDs.join("&");

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
            window.location.search +
            window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` +
            window.location.search +
            window.location.hash
    );

    if (timelineTracks[asset["id"]] && timelineTracks[asset["id"]].intervals) {
      timelineTracks[asset["id"]].intervals.map((t) => {
        if (t.data.id == data.id) {
          timelineTracks[asset["id"]].intervals.splice(
            timelineTracks[asset["id"]].intervals.indexOf(t),
            1
          );
        }
      });
      viewer.timeline._makeTics();

      if (timelineTracks[asset["id"]].intervals.length == 0) {
        viewer.timeline._trackList.splice(
          viewer.timeline._trackList.indexOf(timelineTracks[asset["id"]]),
          1
        );

        timelineTracks[asset["id"]] = null;
        delete timelineTracks[asset["id"]];

        viewer.timeline._makeTics();
        viewer.timeline.container.style.bottom =
          Object.keys(timelineTracks).length * 8 + "px";
        viewer.timeline._trackContainer.style.height =
          Object.keys(timelineTracks).length * 8 + 1 + "px";

        document.getElementById(`assetColorDiv-${asset.id}`).style["display"] =
          "none";
        asset.data.map((d) => {
          document.getElementById(`colorDiv-${d}`).style["display"] = "none";
        });
      }
    }
    if (
      !!selectedDatasets.find(
        (d) =>
          d.type == "PointCloud" ||
          d.type == "EPTPointCloud" ||
          d.type == "ModelTileset"
      )
    ) {
      document.getElementById("msse-slider-row").style.display = "table-row";
      document.getElementById("dims-toolbar-row").style.display = "table-row";
    } else {
      document.getElementById("msse-slider-row").style.display = "none";
      document.getElementById("dims-toolbar-row").style.display = "none";
    }
  }
  if (timelineOnDataSelect) {
    syncTimeline(false);
  }

  if (layerCheckBox) {
    layerCheckBox.checked = projectLayerDataIDs.every((id) =>
      selectedDatasets.find((d) => d.id == id)
    );
  }
};

const handleAssetCheckboxChange = (
  checkboxes,
  assetCheckbox,
  asset,
  uploads
) => {
  checkboxes.map((cb) => {
    cb.checked = assetCheckbox.checked;
  });

  asset["data"].map((id) => {
    if (cropBoxes[id]) {
      if (
        assetCheckbox.checked &&
        !!document.getElementById(`cropButton-${id}`).style.color
      ) {
        cropBoxes[id].enable();
        cropBoxes[id].toggleVisibilityOn();
      } else {
        cropBoxes[id].disable();
        cropBoxes[id].toggleVisibilityOff();
      }
    }
  });

  if (assetCheckbox.checked) {
    var dataIDs = "";
    var newDataIDs = [];
    if (selectedDatasets) {
      selectedDatasets.map((d) => {
        newDataIDs.push(d.id);
      });
    }

    asset["data"].map((id) => {
      if (!newDataIDs.includes(id)) {
        newDataIDs.push(id);
      }
    });

    newDataIDs.sort((a, b) => a - b);

    newDataIDs.map((id) => {
      dataIDs += id + "&";
    });

    dataIDs = dataIDs.slice(0, dataIDs.length - 1);

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
            window.location.search +
            window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` +
            window.location.search +
            window.location.hash
    );
    loadAsset(asset, false, true);

    var firstAssetData = selectedDatasets.find((d) => d.asset.id == asset.id);
    if (
      firstAssetData &&
      firstAssetData.type != "Influx" &&
      firstAssetData.type != "ImageSeries"
    ) {
      if (timelineOnDataSelect) {
        syncTimeline(true);
      }
    }
  } else {
    selectedDatasets.map((d) => {
      if (d.asset.id === asset.id) {
        if (tilesets[d.asset.id] && tilesets[d.asset.id][d.id]) {
          if (Array.isArray(tilesets[d.asset.id][d.id])) {
            tilesets[d.asset.id][d.id].map((tileset) => {
              tileset.show = false;
            });
          } else {
            tilesets[d.asset.id][d.id].show = false;
          }
        }
        if (dataSources[d.asset.id] && dataSources[d.asset.id][d.id]) {
          dataSources[d.asset.id][d.id].show = false;
        }
        if (entities[d.asset.id] && entities[d.asset.id][d.id]) {
          entities[d.asset.id][d.id].show = false;
        }
        if (imageryLayers[d.asset.id] && imageryLayers[d.asset.id][d.id]) {
          imageryLayers[d.asset.id][d.id].show = false;
        }
        if (d["type"] == "Influx" || d["type"] == "CSV") {
          var container = document.getElementById("graphs-container");

          const children = [...container.children];
          for (var i = 0; i < children.length; i++) {
            if (children[i].id.startsWith(`graph_${d.id}`)) {
              container.removeChild(children[i]);
            }
          }
        }
      }
    });
    setSelectedDatasets(
      selectedDatasets.filter((d) => {
        return d.asset.id != asset.id;
      })
    );
    //data?
    setSelectedAssetIDs(
      selectedAssetIDs.filter((a) => {
        // return a != data.asset.id;
        return a != asset;
      })
    );

    if (!selectedDatasets.find((d) => d.type === "ImageSeries")) {
      document.getElementById("image-series-toolbar-row").style.display =
        "none";
    }

    if (
      !selectedDatasets.find((d) => d.type === "Influx" || d.type === "CSV")
    ) {
      closeGraphModal();
    }

    var dataIDs = [];
    selectedDatasets.map((d) => {
      dataIDs.push(d.id);
    });

    dataIDs.sort((a, b) => a - b);

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs.join("&")}` +
            window.location.search +
            window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs.join("&")}` +
            window.location.search +
            window.location.hash
    );

    if (viewer.timeline._trackList.indexOf(timelineTracks[asset["id"]]) != -1) {
      viewer.timeline._trackList.splice(
        viewer.timeline._trackList.indexOf(timelineTracks[asset["id"]]),
        1
      );
    }

    timelineTracks[asset["id"]] = null;
    delete timelineTracks[asset["id"]];

    viewer.timeline._makeTics();
    viewer.timeline.container.style.bottom =
      Object.keys(timelineTracks).length * 8 - 1 + "px";
    viewer.timeline._trackContainer.style.height =
      Object.keys(timelineTracks).length * 8 + 1 + "px";

    document.getElementById(`assetColorDiv-${asset.id}`).style["display"] =
      "none";

    asset.data.map((d) => {
      document.getElementById(`colorDiv-${d}`).style["display"] = "none";
    });

    viewer.timeline._trackList.map((t, i) => {
      if (i == 0) {
        t.color = Cesium.Color.fromHsl(0, 1, 0.5, 1);
      } else {
        t.color = Cesium.Color.fromHsl(
          (((i + 1) / viewer.timeline._trackList.length) * 300) / 360,
          1,
          0.5,
          1
        );
      }

      var assetID = Object.keys(timelineTracks).find(
        (k) => timelineTracks[k] == t
      );
      document.getElementById(`assetColorDiv-${assetID}`).style["background"] =
        timelineTracks[assetID].color.toCssColorString();

      assets
        .find((aid) => aid.id == assetID)
        .data.map((d) => {
          document.getElementById(`colorDiv-${d}`).style["display"] = "block";
          document.getElementById(`colorDiv-${d}`).style["background"] =
            timelineTracks[assetID].color.toCssColorString();
        });
    });

    if (timelineOnDataSelect) {
      syncTimeline(true);
    }
  }
};

const createZoomButton = (asset, data) => {
  var zoomButton = document.createElement("div");
  zoomButton.className = "fa fa-video-camera sidebar-button";
  zoomButton.onclick = (evt) => {
    if (entities[asset.id] && entities[asset.id][data.id]) {
      Cesium.sampleTerrainMostDetailed(
        viewer.terrainProvider,
        Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(
          entities[asset.id][data.id].polygon.hierarchy.getValue().positions
        )
      ).then((updatedPositions) => {
        viewer.camera.flyToBoundingSphere(
          Cesium.BoundingSphere.fromPoints(
            Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
              updatedPositions
            )
          ),
          {
            offset: new Cesium.HeadingPitchRange(
              entities[asset.id][data.id].polygon.stRotation,
              Cesium.Math.toRadians(-45),
              0
            ),
          }
        );
      });
    }
  };
  return zoomButton;
};

const createTimeseriesDiv = (asset, assetCheckbox, checkboxes, uploads) => {
  var timeseriesDiv = document.createElement("div");
  timeseriesDiv.className = "sidebar-item";

  var timeseriesContentDiv = document.createElement("div");
  timeseriesContentDiv.style.padding = "0 54px";
  timeseriesContentDiv.innerHTML = "All Layers";

  timeseriesDiv.onclick = () => {
    assetCheckbox.indeterminate = false;
    assetCheckbox.checked = true;
    checkboxes?.map((cb) => {
      cb.checked = assetCheckbox.checked;
    });
    var dataIDs = "";
    var newDataIDs = [];
    if (selectedDatasets) {
      selectedDatasets.map((d) => {
        newDataIDs.push(d.id);
      });
    }

    asset["data"].map((id) => {
      if (!newDataIDs.includes(id)) {
        newDataIDs.push(id);
      }
    });

    newDataIDs.sort((a, b) => a - b);

    newDataIDs.map((id) => {
      dataIDs += id + "&";
    });

    dataIDs = dataIDs.slice(0, dataIDs.length - 1);

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
            window.location.search +
            window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` +
            window.location.search +
            window.location.hash
    );
    loadAsset(asset, true, true);
  };

  timeseriesDiv.appendChild(timeseriesContentDiv);

  return timeseriesDiv;
};

const createOpacitySliderBtn = (asset, data, dateDiv) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";
  opacitySliderBtn.style["margin-left"] = "5px";

  var opacityDropdown = document.getElementById("alpha-slider-container");

  opacitySliderBtn.onmouseover = (evt) => {
    var alpha = getAlpha(asset, data);

    document.getElementById("alpha-slider").value = Math.round(alpha * 100);
    document.getElementById("alpha-value").innerHTML =
      document.getElementById("alpha-slider").value + " %";

    var rect = evt.target.getBoundingClientRect();
    opacityDropdown.style.left = rect.x + rect.width / 2 + "px";
    opacityDropdown.style.top = rect.y + rect.height / 2 + "px";
    opacityDropdown.style.display = "block";
    opacitySliderBtn.style.color = "white";

    opacityDropdown.onmouseover = (event) => {
      opacityDropdown.style.display = "block";
      opacitySliderBtn.style.color = "white";
      dateDiv.style.background = "#5B8B51";
    };

    opacityDropdown.onmouseleave = (event) => {
      opacityDropdown.style.display = "none";
      opacitySliderBtn.style.color = "black";
      dateDiv.style.background = null;
    };

    document.getElementById("alpha-slider").oninput = (event) => {
      document.getElementById("alpha-value").innerHTML =
        event.target.value + " %";
      applyAlpha(event.target.value / 100, asset, data);
    };
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
};

const createAssetOpacitySliderBtn = (asset, dateDiv, assetDatasets) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";
  opacitySliderBtn.style["margin-left"] = "5px";

  var opacityDropdown = document.getElementById("alpha-slider-container");

  opacitySliderBtn.onmouseover = (evt) => {
    var alphas = [];
    assetDatasets.map((data) => {
      var alpha = getAlpha(asset, data);
      if (alpha != undefined) {
        alphas.push(alpha);
      }
    });

    if (alphas.length != 0 && alphas.every((a) => a == alphas[0])) {
      document.getElementById("alpha-slider").value = alphas[0] * 100;
      document.getElementById("alpha-value").value = alphas[0] * 100 + " %";
    } else {
      document.getElementById("alpha-slider").value = 100;
      document.getElementById("alpha-value").innerHTML = "100 %";
    }

    document.getElementById("alpha-slider").value = Math.round(
      document.getElementById("alpha-slider").value
    );
    document.getElementById("alpha-value").innerHTML =
      document.getElementById("alpha-slider").value + " %";

    var rect = evt.target.getBoundingClientRect();
    opacityDropdown.style.left = rect.x + rect.width / 2 + "px";
    opacityDropdown.style.top = rect.y + rect.height / 2 + "px";

    opacityDropdown.style.display = "block";
    opacitySliderBtn.style.color = "white";

    opacityDropdown.onmouseover = (event) => {
      opacityDropdown.style.display = "block";
      opacitySliderBtn.style.color = "white";
      dateDiv.style.background = "#5B8B51";
    };

    opacityDropdown.onmouseleave = (event) => {
      opacityDropdown.style.display = "none";
      opacitySliderBtn.style.color = "black";
      dateDiv.style.background = null;
    };

    document.getElementById("alpha-slider").oninput = (event) => {
      assetDatasets.map((data) => {
        document.getElementById("alpha-value").innerHTML =
          event.target.value + " %";
        var alpha = event.target.value / 100;
        applyAlpha(alpha, asset, data);
      });
    };
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
};

const createProjectOpacitySliderBtn = (projectAssets, projectDiv) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";

  var opacityDropdown = document.getElementById("alpha-slider-container");

  opacitySliderBtn.onmouseover = (evt) => {
    var alphas = [];
    projectAssets.map((asset) => {
      var assetDatasets = [];
      asset?.data?.map((dataID, index) => {
        for (var i = 0; i < datasets.length; i++) {
          if (datasets[i].id == dataID) {
            assetDatasets.push(datasets[i]);
          }
        }
      });

      assetDatasets.map((data) => {
        var alpha = getAlpha(asset, data);
        if (alpha != undefined) {
          alphas.push(alpha);
        }
      });
    });

    if (alphas.length != 0 && alphas.every((a) => a == alphas[0])) {
      document.getElementById("alpha-slider").value = alphas[0] * 100;
      document.getElementById("alpha-value").value = alphas[0] * 100 + " %";
    } else {
      document.getElementById("alpha-slider").value = 100;
      document.getElementById("alpha-value").innerHTML = "100 %";
    }

    document.getElementById("alpha-slider").value = Math.round(
      document.getElementById("alpha-slider").value
    );
    document.getElementById("alpha-value").innerHTML =
      document.getElementById("alpha-slider").value + " %";

    var rect = evt.target.getBoundingClientRect();
    opacityDropdown.style.left = rect.x + rect.width / 2 + "px";
    opacityDropdown.style.top = rect.y + rect.height / 2 + "px";

    opacityDropdown.style.display = "block";
    opacitySliderBtn.style.color = "white";

    opacityDropdown.onmouseover = (event) => {
      opacityDropdown.style.display = "block";
      opacitySliderBtn.style.color = "white";
      projectDiv.style.background = "#5B8B51";
    };

    opacityDropdown.onmouseleave = (event) => {
      opacityDropdown.style.display = "none";
      opacitySliderBtn.style.color = "black";
      projectDiv.style.background = null;
    };

    document.getElementById("alpha-slider").oninput = (event) => {
      projectAssets.map((asset) => {
        var assetDatasets = [];
        asset?.data?.map((dataID, index) => {
          for (var i = 0; i < datasets.length; i++) {
            if (datasets[i].id == dataID) {
              assetDatasets.push(datasets[i]);
            }
          }
        });
        assetDatasets.map((data) => {
          document.getElementById("alpha-value").innerHTML =
            event.target.value + " %";
          var alpha = event.target.value / 100;
          applyAlpha(alpha, asset, data);
        });
      });
    };
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
};

const createDownloadBtn = (asset, data, dateDiv, index) => {
  var downloadBtn = document.createElement("div");
  downloadBtn.className = "fa fa-download";
  downloadBtn.style.float = "right";
  downloadBtn.style.paddingLeft = "5px";

  downloadBtn.onclick = (evt) => {
    evt.stopPropagation();
  };

  downloadBtn.onmouseover = (evt) => {
    var dlDropdown = document.getElementById("dlDropdown");
    dlDropdown.style.left =
      evt.target.offsetLeft +
      evt.target.offsetWidth / 2 -
      document.getElementById("sidebar-data-buttons").scrollLeft +
      "px";
    dlDropdown.style.top =
      (document.getElementById("nav-header")
        ? document.getElementById("nav-header").offsetHeight
        : 0) +
      evt.target.offsetTop +
      evt.target.offsetHeight / 2 -
      document.getElementById("sidebar-data-buttons").scrollTop +
      "px";
    dlDropdown.style.display = "block";
    downloadBtn.style.color = "white";

    dlDropdown.onmouseover = (event) => {
      dlDropdown.style.display = "block";
      downloadBtn.style.color = "white";
      dateDiv.style.background = "#5B8B51";
    };

    dlDropdown.onmouseleave = (event) => {
      dlDropdown.style.display = "none";
      downloadBtn.style.color = "black";
      dateDiv.style.background = null;
    };

    if (data.type === "PointCloud" || data.type === "EPTPointCloud") {
      pcFormats.map((format) => {
        dlDropdown.children["dl-" + format].style.display = "block";
        dlDropdown.children["dl-" + format].onclick = () => {
          downloadFile(asset, data, index, format);
        };
      });
      dlDropdown.children["dl-geojson"].style.display = "none";
      dlDropdown.children["dl-gltf"].style.display = "none";
      dlDropdown.children["dl-json"].style.display = "none";
      dlDropdown.children["dl-tif"].style.display = "none";
    } else if (data.type === "GeoJSON") {
      pcFormats.map((format) => {
        dlDropdown.children["dl-" + format].style.display = "none";
      });
      if (data.url.endsWith(".geojson")) {
        dlDropdown.children["dl-geojson"].style.display = "block";
        dlDropdown.children["dl-geojson"].onclick = () => {
          downloadFile(asset, data, index, data.type);
        };
      } else {
        dlDropdown.children["dl-geojson"].style.display = "none";
      }
      if (data.url.endsWith(".json")) {
        dlDropdown.children["dl-json"].style.display = "block";
        dlDropdown.children["dl-json"].onclick = () => {
          downloadFile(asset, data, index, data.type);
        };
      } else {
        dlDropdown.children["dl-json"].style.display = "none";
      }
      dlDropdown.children["dl-gltf"].style.display = "none";
      dlDropdown.children["dl-tif"].style.display = "none";
    } else if (data.type === "Model") {
      pcFormats.map((format) => {
        dlDropdown.children["dl-" + format].style.display = "none";
      });
      dlDropdown.children["dl-geojson"].style.display = "none";
      dlDropdown.children["dl-gltf"].style.display = "block";
      dlDropdown.children["dl-gltf"].onclick = () => {
        downloadFile(asset, data, index, data.type);
      };
      dlDropdown.children["dl-json"].style.display = "none";
      dlDropdown.children["dl-tif"].style.display = "none";
    } else if (data.type === "Influx") {
      pcFormats.map((format) => {
        dlDropdown.children["dl-" + format].style.display = "none";
      });
      dlDropdown.children["dl-geojson"].style.display = "none";
      dlDropdown.children["dl-gltf"].style.display = "none";
      dlDropdown.children["dl-json"].style.display = "block";
      dlDropdown.children["dl-json"].onclick = () => {
        downloadFile(asset, data, index, data.type);
      };
      dlDropdown.children["dl-tif"].style.display = "none";
    } else if (data.type === "Imagery") {
      pcFormats.map((format) => {
        dlDropdown.children["dl-" + format].style.display = "none";
      });
      dlDropdown.children["dl-geojson"].style.display = "none";
      dlDropdown.children["dl-gltf"].style.display = "none";
      dlDropdown.children["dl-json"].style.display = "none";
      dlDropdown.children["dl-tif"].style.display = "block";
      dlDropdown.children["dl-tif"].onclick = () => {
        downloadFile(asset, data, index, data.type);
      };
    }
  };

  downloadBtn.onmouseleave = (evt) => {
    dlDropdown.style.display = "none";
    downloadBtn.style.color = "black";
  };
  return downloadBtn;
};

const createMarkersDataSource = () => {
  if (!markersDataSource) {
    setMarkersDataSource(new Cesium.CustomDataSource());
    markersDataSource.clustering.enabled = true;

    markersDataSource.clustering.clusterEvent.addEventListener(function (
      clusteredEntities,
      cluster
    ) {
      cluster.label.show = false;
      cluster.billboard.show = true;

      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
      cluster.billboard.image = pinBuilder
        .fromText(
          cluster.label.text,
          Cesium.Color.fromCssColorString("#5B8B51"),
          48
        )
        .toDataURL();
      cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      cluster.billboard.heightReference =
        Cesium.HeightReference.CLAMP_TO_GROUND;

      var id = clusteredEntities[0].id.slice("marker_".length);
      var data = datasets.find((d) => d.id == id);

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

      cluster.billboard.distanceDisplayCondition =
        new Cesium.DistanceDisplayCondition(
          data.boundingSphereRadius
            ? data.boundingSphereRadius * 4
            : data.bounds
            ? rectBoundingSphere.radius * 4
            : 2500,
          Number.MAX_VALUE
        );
    });
  }
};

const createAssetDiv = (asset, uploads, datesPanelDiv) => {
  var assetDiv = createAccordion(asset.name, 36);
  var assetCheckbox = document.createElement("input");
  assetCheckbox.id = `assetCheckbox-${asset.id}`;
  assetCheckbox.type = "checkbox";
  assetCheckbox.style.float = "left";
  assetCheckbox.style.margin = "0 5px 0 0";

  assetDiv.firstChild.prepend(assetCheckbox);

  var assetColorDiv = document.createElement("div");
  assetColorDiv.style =
    "width: 12px;height: 12px;background: red;margin-left: 5px;border-radius: 1px;display:none;flex-shrink:0;";
  assetColorDiv.id = `assetColorDiv-${asset.id}`;
  assetDiv.firstChild.appendChild(assetColorDiv);

  if (asset.data) {
    var checkboxes = [];
    var assetDatasets = [];
    var dateDivs = [];
    asset.data.map((dataID, index) => {
      var data;
      for (var i = 0; i < datasets.length; i++) {
        if (datasets[i].id == dataID) {
          data = datasets[i];
          data.asset = asset;
          assetDatasets.push(data);
          break;
        }
      }

      if (!data) return;
      var dateDiv = document.createElement("div");
      dateDiv.className = "sidebar-item";
      dateDiv.id = `dataButton-${data.id}`;

      var checkbox = document.createElement("input");
      checkbox.id = `dataCheckbox-${data.id}`;
      checkbox.type = "checkbox";
      checkbox.style.float = "left";
      checkbox.style.margin = "0 5px 0 0";

      if (init && init.index && data && data.asset && data.asset.project) {
        checkbox.checked =
          selectedDataIDs &&
          selectedDataIDs.includes(data.id.toString()) &&
          data.asset.categoryID == -3;
      } else {
        checkbox.checked =
          selectedDataIDs && selectedDataIDs.includes(data.id.toString());
      }

      checkboxes.push(checkbox);

      assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
      assetCheckbox.indeterminate =
        !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);

      checkbox.onchange = (e) => {
        if (cropRectangles[data.id]) {
          cropRectangles[data.id].destroy();
          delete cropRectangles[data.id];
        }

        if (cropBoxes[data.id]) {
          if (checkbox.checked) {
            if (
              !!document.getElementById(`cropButton-${data.id}`).style.color
            ) {
              cropBoxes[data.id].enable();
              if (showCheckbox.checked) {
                cropBoxes[data.id].toggleVisibilityOn();
              }
            }
          } else {
            cropBoxes[data.id].disable();
            cropBoxes[data.id].toggleVisibilityOff();
          }
        }

        if (boxDrawButton) {
          boxDrawButton.style["background"] = "#ededed";
          boxDrawButton.style["color"] = "black";
        }
        if (tr4) tr4.style.display = "none";

        handleDataCheckboxChange(
          checkbox,
          assetCheckbox,
          checkboxes,
          asset,
          data,
          uploads
        );
      };

      var dateContentDiv = document.createElement("div");
      dateContentDiv.style.padding = "0 54px";
      dateContentDiv.style.display = "flex";

      var dateContentDivText = document.createElement("div");
      dateContentDivText.style["flex-grow"] = 1;
      dateContentDivText.style["overflow-wrap"] = "anywhere";
      if (data.date) {
        var date = new Date(data.date);
        dateContentDivText.innerHTML =
          (date.toString() !== "Invalid Date"
            ? new Date(data.date).toLocaleDateString("en-au", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
              })
            : data.date) + (data.name ? " - " + data.name : "");
      } else {
        dateContentDivText.innerHTML = data.name ? data.name : "No Date";
      }

      dateContentDiv.appendChild(checkbox);
      dateContentDiv.appendChild(dateContentDivText);
      dateDiv.appendChild(dateContentDiv);
      dateDivs.push(dateDiv);

      if (
        data.type == "PointCloud" ||
        (data.type == "EPTPointCloud" && !Array.isArray(data.url)) ||
        data.type == "ModelTileset"
      ) {
        var cropDiv = document.createElement("div");
        cropDiv.style.display = "none";
        cropDiv.style["border-bottom"] = "1px solid #efe5d5";
        cropDiv.style.background = "wheat";
        cropDiv.id = `cropDiv-${data.id}`;

        var cropTable1 = document.createElement("table");
        cropTable1.style = "width: 100%;padding: 5px;";
        var tr1 = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Show: ";
        var showCheckbox = document.createElement("input");
        showCheckbox.id = `crop-checkbox-${data.id}`;
        showCheckbox.type = "checkbox";
        showCheckbox.style = "padding: 0;vertical-align:middle;";
        showCheckbox.checked = true;
        showCheckbox.onchange = () => {
          if (tilesets[data.asset.id][data.id].show) {
            if (cropBoxes[data.id]) {
              if (showCheckbox.checked) {
                cropBoxes[data.id].toggleVisibilityOn();
              } else {
                cropBoxes[data.id].toggleVisibilityOff();
              }
            }
          }
        };
        td.appendChild(showCheckbox);
        var td2 = document.createElement("td");
        td2.innerHTML = "Above ground: ";
        var aboveGroundCheckbox = document.createElement("input");
        aboveGroundCheckbox.type = "checkbox";
        aboveGroundCheckbox.style = "padding: 0; vertical-align:middle;";
        aboveGroundCheckbox.id = `aboveGroundCheckbox-${data.id}`;
        aboveGroundCheckbox.checked = false;
        aboveGroundCheckbox.onchange = () => {
          cropBoxes[data.id].toggleAboveGround();
        };
        td2.appendChild(aboveGroundCheckbox);
        tr1.appendChild(td);
        tr1.appendChild(td2);
        cropTable1.appendChild(tr1);

        var cropTable2 = document.createElement("table");
        cropTable2.style = "width: 100%;padding: 5px;";
        var tr2 = document.createElement("tr");
        var td3 = document.createElement("td");
        td3.innerHTML = "Direction: ";
        td3.style.width = "100px";
        var td4 = document.createElement("td");
        var directionSelect = document.createElement("select");
        directionSelect.id = `crop-direction-${data.id}`;
        directionSelect.style.width = "75px";
        var insideOption = document.createElement("option");
        insideOption.innerHTML = "Inside";
        insideOption.value = "inside";
        var outsideOption = document.createElement("option");
        outsideOption.innerHTML = "Outside";
        outsideOption.value = "outside";
        directionSelect.appendChild(insideOption);
        directionSelect.appendChild(outsideOption);
        directionSelect.value = "outside";

        var cropTable4 = document.createElement("table");
        var tr4 = document.createElement("tr");
        tr4.id = `draw-msg-${data.id}`;
        tr4.innerHTML =
          "Please click on the map for the 2 vertices and the extrusion height";
        tr4.style.display = "none";
        cropTable4.appendChild(tr4);

        directionSelect.onchange = () => {
          var val = directionSelect.value;
          const clipDirection = val === "inside" ? -1 : 1;

          var clippingPlanes = tilesets[data.asset.id][data.id].clippingPlanes;

          clippingPlanes._planes.map((p) => {
            p.distance = Math.abs(p.distance) * clipDirection;
          });

          clippingPlanes.unionClippingRegions = val === "inside" ? false : true;
        };
        td4.appendChild(directionSelect);
        if (
          (data.type == "EPTPointCloud" && !Array.isArray(data.url)) ||
          (data.source && data.source.ept)
        ) {
          var td5 = document.createElement("td");
          var exportButton = document.createElement("button");
          exportButton.id = "export-btn";
          exportButton.innerHTML = "Export";
          exportButton.style = "width:100%;";

          var exportModal = document.getElementById("export-modal");
          var exportCancel = document.getElementById("export-cancel");
          var exportOk = document.getElementById("export-ok");

          exportCancel.onclick = () => {
            cropControllers.eptFileSize?.abort();
            cropControllers.eptFileSize = new AbortController();
            cropControllers.eptNumPoints?.abort();
            cropControllers.eptNumPoints = new AbortController();
            exportModal.style.display = "none";
          };

          exportButton.onclick = () => {
            exportModal.style.display = "block";

            if (data.type == "EPTPointCloud") {
              var urlParams = new URLSearchParams(
                tilesets[data.asset.id][data.id]._url.split("?")[1]
              );
              var ept = urlParams.get("ept");
            } else {
              var ept = data.source.ept;
            }

            if (
              data.position &&
              tilesets[data.asset.id][data.id].boundingSphereCenter
            ) {
              var offset = Cesium.Cartographic.toCartesian(
                new Cesium.Cartographic.fromDegrees(
                  data["position"]["lng"],
                  data["position"]["lat"],
                  data["position"]["height"]
                )
              );
              var translation = Cesium.Cartesian3.subtract(
                offset,
                tilesets[data.asset.id][data.id].boundingSphereCenter,
                new Cesium.Cartesian3()
              );
            }
            var now = Cesium.JulianDate.now();

            var scalePoints = cropBoxes[data.id]?.scalePoints.slice(0, 8);
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
            var outside =
              !tilesets[data.asset.id][data.id].clippingPlanes
                ?.unionClippingRegions;

            var totalPoints = tilesets[data.asset.id][data.id].asset.ept.points;
            document.getElementById("export-modal-total-points").innerHTML =
              totalPoints;

            var fileSize;
            var numPoints;

            document.getElementById("export-modal-total-size").innerHTML =
              '<div class="loader"></div>';
            document.getElementById("export-modal-export-points").innerHTML =
              '<div class="loader"></div>';
            document.getElementById("export-modal-export-size").innerHTML =
              '<div class="loader"></div>';

            var exportModalUpdate = () => {
              var reqs = [];
              cropControllers.eptFileSize?.abort();
              cropControllers.eptNumPoints?.abort();
              cropControllers.eptFileSize = new AbortController();
              cropControllers.eptNumPoints = new AbortController();
              if (!tilesets[data.asset.id][data.id].fileSize) {
                reqs.push(
                  fetch(`${processingAPI}/eptFileSize?ept=${ept}`, {
                    signal: cropControllers.eptFileSize.signal,
                    cache: "no-store",
                    credentials: "include",
                  })
                    .then((response) => {
                      if (response.status === 200) {
                        return response.text();
                      } else {
                        document.getElementById(
                          "export-modal-total-size"
                        ).innerHTML = "Error";
                        document.getElementById(
                          "export-modal-export-size"
                        ).innerHTML = "Error";
                      }
                    })
                    .then((resp) => {
                      if (resp) {
                        fileSize = Number(resp) / (1024 * 1024); //MB
                        tilesets[data.asset.id][data.id].fileSize = fileSize;
                        document.getElementById(
                          "export-modal-total-size"
                        ).innerHTML = Math.round(fileSize * 100) / 100 + " MB";
                      }
                    })
                    .catch((error) => {
                      if (error.name !== "AbortError") {
                        console.log(error);
                        document.getElementById(
                          "export-modal-total-size"
                        ).innerHTML = "Error";
                        document.getElementById(
                          "export-modal-export-size"
                        ).innerHTML = "Error";
                      }
                    })
                );
              } else {
                fileSize = tilesets[data.asset.id][data.id].fileSize;
                document.getElementById("export-modal-total-size").innerHTML =
                  Math.round(tilesets[data.asset.id][data.id].fileSize * 100) /
                    100 +
                  " MB";
              }

              reqs.push(
                fetch(
                  `${processingAPI}/eptNumPoints?ept=${ept}&polygon=${wktPolygon}&bbox=${bbox}`,
                  {
                    signal: cropControllers.eptNumPoints.signal,
                    cache: "no-store",
                    credentials: "include",
                  }
                )
                  .then((response) => {
                    if (response.status === 200) {
                      return response.text();
                    } else {
                      document.getElementById(
                        "export-modal-export-points"
                      ).innerHTML = "Error";
                      document.getElementById(
                        "export-modal-export-size"
                      ).innerHTML = "Error";
                    }
                  })
                  .then((resp) => {
                    if (resp) {
                      numPoints = !outside
                        ? Number(resp)
                        : totalPoints - Number(resp);
                      document.getElementById(
                        "export-modal-export-points"
                      ).innerHTML = numPoints;
                    }
                  })
                  .catch((error) => {
                    if (error.name !== "AbortError") {
                      console.log(error);
                      document.getElementById(
                        "export-modal-export-points"
                      ).innerHTML = "Error";
                      document.getElementById(
                        "export-modal-export-size"
                      ).innerHTML = "Error";
                    }
                  })
              );

              Promise.all(reqs)
                .then(() => {
                  if (fileSize) {
                    var estSize =
                      Math.round((numPoints / totalPoints) * fileSize * 100) /
                      100;
                    document.getElementById(
                      "export-modal-export-size"
                    ).innerHTML = estSize + " MB";
                  } else {
                    document.getElementById(
                      "export-modal-export-size"
                    ).innerHTML = "Error";
                  }
                })
                .catch(() => {
                  document.getElementById(
                    "export-modal-export-size"
                  ).innerHTML = "Error";
                });
            };

            cropControllers.eptFileSize?.abort();
            cropControllers.eptFileSize = new AbortController();
            cropControllers.eptNumPoints?.abort();
            cropControllers.eptNumPoints = new AbortController();
            exportModalUpdate();

            exportOk.onclick = () => {
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

              var regions = [
                {
                  fileName: fileName,
                  url: ept,
                  type: "ept",
                  polygon: wktPolygon,
                  bbox: bbox,
                  outside: false,
                },
              ];

              var zipName =
                fileName.slice(0, fileName.lastIndexOf(".")) + ".zip";
              var cropLink = `${processingAPI}/crop?regions=${encodeURIComponent(
                JSON.stringify(regions)
              )}&zipName=${zipName}`;

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

              exportModal.style.display = "none";
            };
          };
          td5.appendChild(exportButton);
        }
        tr2.appendChild(td3);
        tr2.appendChild(td4);
        if (td5) tr2.appendChild(td5);
        cropTable2.appendChild(tr2);

        var cropTable3 = document.createElement("table");
        cropTable3.style = "width: 100%;padding: 5px;";
        var tr3 = document.createElement("tr");
        var td7 = document.createElement("td");

        var boxDrawButton = document.createElement("button");
        boxDrawButton.id = `rectangle-btn-${data.id}`;
        boxDrawButton.className = "button-1";
        boxDrawButton.innerHTML = "Draw Custom Clipping Box";
        boxDrawButton.onclick = () => {
          if (!cropRectangles[data.id]) {
            boxDrawButton.style["background"] = "#e5e5e5";
            boxDrawButton.style["border"] = "1px solid #000";
            boxDrawButton.style["border-radius"] = "3px";
            boxDrawButton.style["color"] = "#0075ff";

            if (cropBoxes[data.id]) {
              cropBoxes[data.id].disable();
              cropBoxes[data.id].toggleVisibilityOff();
            }
            cropRectangles[data.id] = new cropRectangle(data);
            tr4.style.display = "table-row";
          } else {
            boxDrawButton.style["background"] = "#ededed";
            boxDrawButton.style["color"] = "black";

            if (cropRectangles[data.id]) {
              cropRectangles[data.id].destroy();
              delete cropRectangles[data.id];
            }

            if (cropBoxes[data.id]) {
              cropBoxes[data.id].enable();
            }

            tr4.style.display = "none";
          }
        };

        td7.appendChild(boxDrawButton);

        tr3.appendChild(td7);
        cropTable3.appendChild(tr3);

        var td8 = document.createElement("td");

        var resetButton = document.createElement("button");
        resetButton.innerHTML = "Reset";
        resetButton.className = "button-1";

        resetButton.onclick = () => {
          if (cropBoxes[data.id]) {
            cropBoxes[data.id].destroy();
          }

          if (cropRectangles[data.id]) {
            cropRectangles[data.id].destroy();
            delete cropRectangles[data.id];

            boxDrawButton.style["background"] = "#ededed";
            boxDrawButton.style["color"] = "black";
            tr4.style.display = "none";
          }

          cropBoxes[data.id] = new cropBox(data);
        };

        td8.appendChild(resetButton);
        tr3.appendChild(td8);

        cropDiv.appendChild(cropTable1);
        cropDiv.appendChild(cropTable2);
        cropDiv.appendChild(cropTable3);
        cropDiv.appendChild(cropTable4);

        dateDivs.push(cropDiv);
      } else if (data.type == "Imagery") {
        var cropDiv = document.createElement("div");
        cropDiv.style.display = "none";
        cropDiv.style["border-bottom"] = "1px solid #efe5d5";
        cropDiv.style.background = "wheat";
        cropDiv.id = `cropDiv-${data.id}`;

        var cropTable1 = document.createElement("table");
        cropTable1.style = "width: 100%;padding: 5px;";
        var tr1 = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Show: ";
        var showCheckbox = document.createElement("input");
        showCheckbox.id = `crop-checkbox-${data.id}`;
        showCheckbox.type = "checkbox";
        showCheckbox.style = "padding: 0;vertical-align:middle;";
        showCheckbox.checked = true;
        showCheckbox.onchange = () => {
          if (imageryLayers[data.asset.id][data.id].show) {
            if (cropBoxes[data.id]) {
              if (showCheckbox.checked) {
                cropBoxes[data.id].toggleVisibilityOn();
              } else {
                cropBoxes[data.id].toggleVisibilityOff();
              }
            }
          }
        };
        td.appendChild(showCheckbox);

        tr1.appendChild(td);
        cropTable1.appendChild(tr1);

        var cropTable2 = document.createElement("table");
        cropTable2.style = "width: 100%;padding: 5px;";

        var cropTable4 = document.createElement("table");
        var tr4 = document.createElement("tr");
        tr4.id = `draw-msg-${data.id}`;
        tr4.innerHTML = "Please click on the map for the 2 vertices";
        tr4.style.display = "none";
        cropTable4.appendChild(tr4);

        if (data.source && data.source.url && data.asset.project) {
          var td5 = document.createElement("td");
          var exportButton = document.createElement("button");
          exportButton.id = "export-btn";
          exportButton.innerHTML = "Export";
          exportButton.className = "button-1";

          var odmImportButton = document.createElement("button");
          odmImportButton.id = "odm-import-btn";
          odmImportButton.innerHTML = "Import to WebODM";
          odmImportButton.className = "button-1";
          odmImportButton.style = "margin-left: 5px;";

          if (data.asset.project && odmProjects) {
            var projectName = odmProjects.find(
              (p) => p.id == data.asset.project
            ).name;
            var fileName = `${projectName}_${data.asset.name}_${
              data.id.endsWith("-op")
                ? "Orthophoto"
                : data.id.endsWith("-dtm")
                ? "DTM"
                : data.id.endsWith("-dsm")
                ? "DSM"
                : ""
            }_Crop.tif`;
          } else {
            var fileName = `${data.asset.name}_${
              data.date
                ? new Date(data.date).toLocaleDateString("en-au", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                  })
                : ""
            }${data.name ? "-" + data.name : ""}_${
              data.id.endsWith("-op")
                ? "Orthophoto"
                : data.id.endsWith("-dtm")
                ? "DTM"
                : data.id.endsWith("-dsm")
                ? "DSM"
                : ""
            }_Crop.tif`;
          }

          var getRegions = () => {
            var scalePoints = cropBoxes[data.id]?.scalePoints.slice(0, 8);
            var groundScalePoints = [
              scalePoints[0],
              scalePoints[1],
              scalePoints[2],
              scalePoints[3],
              scalePoints[0],
            ];

            var wktPolygon = "POLYGON((";
            groundScalePoints.map((entity, index) => {
              var translatedPos = new Cesium.Cartesian3();
              var cartesianPos = entity.position.getValue();
              cartesianPos.clone(translatedPos);

              var pos = Cesium.Cartographic.fromCartesian(translatedPos);
              var lon = pos.longitude * Cesium.Math.DEGREES_PER_RADIAN;
              var lat = pos.latitude * Cesium.Math.DEGREES_PER_RADIAN;
              wktPolygon += `${lon} ${lat}`;
              if (index != groundScalePoints.length - 1) {
                wktPolygon += ",";
              }
            });

            wktPolygon += "))";

            var regions = [
              {
                fileName: fileName,
                url: data.source.url,
                type: "imagery",
                imageryType: data.name,
                taskName: data.asset.name,
                polygon: wktPolygon,
                outside: false,
              },
            ];

            return regions;
          };

          var zipName = fileName.slice(0, fileName.lastIndexOf(".")) + ".zip";

          exportButton.onclick = () => {
            var regions = getRegions();

            if (regions.length > 0) {
              var cropLink = `${processingAPI}/crop?regions=${encodeURIComponent(
                JSON.stringify(regions)
              )}&zipName=${zipName}`;

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

          var controller = new AbortController();
          odmImportButton.onclick = () => {
            controller.abort();
            controller = new AbortController();

            var regions = getRegions();

            if (regions.length > 0) {
              var cropLink = `${processingAPI}/crop?regions=${encodeURIComponent(
                JSON.stringify(regions)
              )}&zipName=${zipName}
              &importToWebODM=true&taskName=${data.asset.name}_crop`;

              if (
                !odmImportButton.lastChild.className ||
                !odmImportButton.lastChild.className === "loader-parent"
              ) {
                var loaderParent = document.createElement("div");
                loaderParent.className = "loader-parent";
                var loader = document.createElement("div");
                loader.className = "loader";
                loaderParent.appendChild(loader);
                odmImportButton.appendChild(loaderParent);
              }

              fetch(cropLink, {
                cache: "no-store",
                credentials: "include",
                signal: controller.signal,
              })
                .then((resp) => {
                  if (odmImportButton.lastChild.className === "loader-parent") {
                    odmImportButton.removeChild(odmImportButton.lastChild);
                  }

                  if (resp.status == 201) {
                    sourceDivs[
                      "WebODM Projects"
                    ].nextElementSibling.firstChild.style.display = "flex";
                    sourceDivs[
                      "WebODM Projects"
                    ].nextElementSibling.firstChild.nextElementSibling.style.display =
                      "none";
                    sourceDivs[
                      "WebODM Projects"
                    ].nextElementSibling.firstChild.nextElementSibling.nextElementSibling.style.display =
                      "none";

                    setLoadingFinished(false); //?

                    setTimeout(() => {
                      fetchWebODMProjects()
                        .then(() => {
                          setLoadingFinished(true);
                          sourceDivs[
                            "WebODM Projects"
                          ].nextElementSibling.firstChild.style.display =
                            "none";
                          sourceDivs[
                            "WebODM Projects"
                          ].nextElementSibling.firstChild.nextElementSibling.style.display =
                            "block";
                          sourceDivs[
                            "WebODM Projects"
                          ].nextElementSibling.firstChild.nextElementSibling.nextElementSibling.style.display =
                            "block";
                          setupSidebar(false);

                          var height = 0;
                          var children = [...accordionDiv.children];
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
                          accordionDiv.style.maxHeight = height + "px";
                        })
                        .catch(() => {
                          setLoadingFinished(true);

                          setupSidebar(false);
                        });
                    }, 5000);
                  } else {
                    alert("there was an issue importing to webODM");
                  }
                })
                .catch(() => {
                  if (odmImportButton.lastChild.className === "loader-parent") {
                    odmImportButton.removeChild(odmImportButton.lastChild);
                  }

                  alert("there was an issue importing to webODM");
                });
            }
          };
          td5.appendChild(exportButton);
          td5.appendChild(odmImportButton);
        }

        var cropTable3 = document.createElement("table");
        cropTable3.style = "width: 100%;padding: 5px;";
        var tr3 = document.createElement("tr");
        var td7 = document.createElement("td");

        var boxDrawButton = document.createElement("button");
        boxDrawButton.id = `rectangle-btn-${data.id}`;
        boxDrawButton.className = "button-1";
        boxDrawButton.innerHTML = "Draw Custom Clipping Box";
        boxDrawButton.onclick = () => {
          if (!cropRectangles[data.id]) {
            boxDrawButton.style["background"] = "#e5e5e5";
            boxDrawButton.style["border"] = "1px solid #000";
            boxDrawButton.style["border-radius"] = "3px";
            boxDrawButton.style["color"] = "#0075ff";

            if (cropBoxes[data.id]) {
              !!cropBoxes[data.id].disable ?? cropBoxes[data.id].disable();
              cropBoxes[data.id].toggleVisibilityOff();
            }

            cropRectangles[data.id] = new cropRectangle2D(data);
            tr4.style.display = "table-row";
          } else {
            boxDrawButton.style["background"] = "#ededed";
            boxDrawButton.style["color"] = "black";

            if (cropRectangles[data.id]) {
              cropRectangles[data.id].destroy();
              delete cropRectangles[data.id];
            }

            if (cropBoxes[data.id]) {
              cropBoxes[data.id].enable();
            }

            tr4.style.display = "none";
          }
        };

        td7.appendChild(boxDrawButton);

        tr1.appendChild(td7);
        cropTable1.appendChild(tr3);

        var td8 = document.createElement("td");

        var resetButton = document.createElement("button");
        resetButton.innerHTML = "Reset";
        resetButton.className = "button-1";

        resetButton.onclick = () => {
          if (cropBoxes[data.id]) {
            cropBoxes[data.id].destroy();
          }

          if (cropRectangles[data.id]) {
            cropRectangles[data.id].destroy();
            delete cropRectangles[data.id];

            boxDrawButton.style["background"] = "#ededed";
            boxDrawButton.style["color"] = "black";
            tr4.style.display = "none";
          }

          cropBoxes[data.id] = new cropBox2D(data);
        };

        td8.appendChild(resetButton);
        tr3.appendChild(td8);
        if (td5) tr3.appendChild(td5);

        cropDiv.appendChild(cropTable1);
        cropDiv.appendChild(cropTable4);

        dateDivs.push(cropDiv);
      }

      var colorDiv = document.createElement("div");
      colorDiv.style =
        "width: 12px;height: 12px;background: red;margin-left: 5px;border-radius: 1px;display:none;flex-shrink:0;";
      colorDiv.id = `colorDiv-${data.id}`;
      dateContentDiv.appendChild(colorDiv);

      if (
        data.type == "PointCloud" ||
        (data.type == "EPTPointCloud" && !Array.isArray(data.url)) ||
        data.type == "ModelTileset"
      ) {
        var cropButton = document.createElement("div");
        cropButton.title = "Crop";
        cropButton.className = "fa fa-crop sidebar-button";
        cropButton.style["margin-left"] = "5px";
        cropButton.id = `cropButton-${data.id}`;

        cropButton.onclick = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();

          if (!cropButton.style.color || cropButton.style.color == "white") {
            cropButton.style.color = "#0075ff";
            cropDiv.style.display = "block";
            dateDiv.onclick();
          } else {
            cropButton.style.color = null;
            cropDiv.style.display = "none";
          }

          if (!cropBoxes[data.id]) {
            var tilesetTimer = setInterval(checkTileset, 500);
            function checkTileset() {
              if (
                tilesets[data.asset.id] &&
                tilesets[data.asset.id][data.id] &&
                tilesets[data.asset.id][data.id].ready
              ) {
                cropBoxes[data.id] = new cropBox(data);
                clearInterval(tilesetTimer);
              }
            }
          } else {
            cropBoxes[data.id].toggleEnable();

            if (
              showCheckbox.checked &&
              cropBoxes[data.id].clippingPlanes.enabled
            ) {
              cropBoxes[data.id].toggleVisibilityOn();
            } else {
              cropBoxes[data.id].toggleVisibilityOff();
            }
          }

          var panel = datesPanelDiv;

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
                height += parseFloat(children[i].style.maxHeight.slice(0, -2));
              } else {
                height +=
                  children[i].scrollHeight +
                  children[i].getBoundingClientRect().height;
              }
            }
            elem.style.maxHeight = height + "px";

            elem = elem.parentElement;
          }
        };

        var transformButton = document.createElement("div");
        transformButton.title = "Clamp Data to Surface";
        transformButton.className = "fa fa-arrows sidebar-button";
        transformButton.style["margin-left"] = "5px";

        transformButton.onclick = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();

          if (
            !transformButton.style.color ||
            transformButton.style.color == "white"
          ) {
            transformButton.style.color = "#0075ff";
          } else {
            transformButton.style.color = null;
          }

          function clampLowest() {
            if (
              tilesets[data.asset.id] &&
              tilesets[data.asset.id][data.id] &&
              tilesets[data.asset.id][data.id].boundingSphereCenter
            ) {
              clearInterval(clampTimer);
              var tileset = tilesets[data.asset.id][data.id];

              if (
                !transformButton.style.color ||
                transformButton.style.color == "white"
              ) {
                if (data["position"]) {
                  var offset = Cesium.Cartographic.toCartesian(
                    new Cesium.Cartographic.fromDegrees(
                      data["position"]["lng"],
                      data["position"]["lat"],
                      data["position"]["height"]
                    )
                  );
                  var translation = Cesium.Cartesian3.subtract(
                    offset,
                    tileset.boundingSphereCenter,
                    new Cesium.Cartesian3()
                  );
                  tileset.modelMatrix =
                    Cesium.Matrix4.fromTranslation(translation);
                } else {
                  tileset.modelMatrix = Cesium.Matrix4.IDENTITY;
                }
              } else {
                var c = Cesium.Cartesian3.clone(
                  tileset.boundingSphereCenter,
                  new Cesium.Cartesian3()
                );
                var cartoC = Cesium.Cartographic.fromCartesian(c);
                cartoC.height = tileset.root.boundingVolume.minimumHeight;
                Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [
                  cartoC,
                ]).then((updatedPositions) => {
                  var lowest = Cesium.Cartographic.toCartesian(
                    updatedPositions[0]
                  );
                  var c = Cesium.Cartesian3.clone(
                    tileset.boundingSphereCenter,
                    new Cesium.Cartesian3()
                  );

                  var translation = Cesium.Cartesian3.subtract(
                    lowest,
                    c,
                    new Cesium.Cartesian3()
                  );

                  tileset.modelMatrix =
                    Cesium.Matrix4.fromTranslation(translation);
                });
              }
            }
          }

          if (!(tilesets[data.asset.id] && tilesets[data.asset.id][data.id])) {
            clearInterval(clampTimer);
            var clampTimer = setInterval(clampLowest, 500);
          } else {
            clampLowest();
          }
        };

        dateContentDiv.appendChild(transformButton);
        dateContentDiv.appendChild(cropButton);
      } else if (data.type == "Imagery") {
        var cropButton = document.createElement("div");
        cropButton.title = "Crop";
        cropButton.className = "fa fa-crop sidebar-button";
        cropButton.style["margin-left"] = "5px";
        cropButton.id = `cropButton-${data.id}`;

        cropButton.onclick = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();

          if (!cropButton.style.color || cropButton.style.color == "white") {
            cropButton.style.color = "#0075ff";
            cropDiv.style.display = "block";
            dateDiv.onclick();
          } else {
            cropButton.style.color = null;
            cropDiv.style.display = "none";
          }

          if (!cropBoxes[data.id]) {
            var imageryTimer = setInterval(checkImageryLayer, 500);
            function checkImageryLayer() {
              if (
                imageryLayers[data.asset.id] &&
                imageryLayers[data.asset.id][data.id]
              ) {
                cropBoxes[data.id] = new cropBox2D(data);
                clearInterval(imageryTimer);
              }
            }
          } else {
            if (cropBoxes[data.id].getVisibility()) {
              cropBoxes[data.id].toggleVisibilityOff();
            } else {
              if (showCheckbox.checked) {
                cropBoxes[data.id].toggleVisibilityOn();
              }
            }
          }

          var panel = datesPanelDiv;

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
                height += parseFloat(children[i].style.maxHeight.slice(0, -2));
              } else {
                height +=
                  children[i].scrollHeight +
                  children[i].getBoundingClientRect().height;
              }
            }
            elem.style.maxHeight = height + "px";

            elem = elem.parentElement;
          }
        };

        dateContentDiv.appendChild(cropButton);
      }
      if (data.type === "ImageSeries") {
        var zoomButton = createZoomButton(asset, data);
        dateContentDiv.appendChild(zoomButton);
      }

      dateDiv.onclick = (e) => {
        if (
          e &&
          (e.target === checkbox ||
            e.target === zoomButton ||
            e.target === cropButton ||
            e.target === transformButton)
        ) {
          return;
        }
        checkbox.checked = true;
        assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
        assetCheckbox.indeterminate =
          !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);
        if (!selectedDatasets.includes(data)) {
          selectedDatasets.push(data);
        }
        var dataIDs = "";
        var newDataIDs = [];
        selectedDatasets.map((d) => {
          newDataIDs.push(d.id);
        });

        newDataIDs.sort((a, b) => a - b);

        newDataIDs.map((id) => {
          dataIDs += id + "&";
        });

        dataIDs = dataIDs.slice(0, dataIDs.length - 1);

        window.history.pushState(
          "",
          "",
          uploads
            ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` +
                window.location.search +
                window.location.hash
            : `/cesium/Apps/ASDC/${dataIDs}` +
                window.location.search +
                window.location.hash
        );

        loadData(asset, data, true, true, true);

        if (data.styleDimension) {
          setSelectedDimension(data.styleDimension);
        } else {
          setSelectedDimension(null);
        }
        applyStyle(selectedDimension);
        // setupStyleToolbar(tilesets[asset.id][data.id]);

        if (data.type === "Influx" || data.type === "CSV") {
          var container = document.getElementById("graphs-container");

          const children = [...container.children];
          for (var i = 0; i < children.length; i++) {
            if (children[i].id.startsWith(`graph_${data.id}`)) {
              children[i].scrollIntoView({ behavior: "smooth" });
              break;
            }
          }
        }
      };

      if (data.type != "Influx") {
        var opacitySliderBtn = createOpacitySliderBtn(asset, data, dateDiv);
        dateContentDiv.appendChild(opacitySliderBtn);
      }

      if (
        (data.source &&
          (data.source.downloadable == undefined ||
            data.source.downloadable == true)) ||
        data.type === "Influx" ||
        data.type === "GeoJSON"
      ) {
        var downloadBtn = createDownloadBtn(asset, data, dateDiv, index);
        dateContentDiv.appendChild(downloadBtn);
      }
    });

    if (asset.data.length > 1) {
      var timeseriesDiv = createTimeseriesDiv(
        asset,
        assetCheckbox,
        checkboxes,
        uploads
      );
      datesPanelDiv.appendChild(timeseriesDiv);
    }

    dateDivs.map((div) => {
      datesPanelDiv.appendChild(div);
    });

    var opacityBtn = createAssetOpacitySliderBtn(
      asset,
      assetDiv,
      assetDatasets
    );
    assetDiv.firstChild.appendChild(opacityBtn);
  }

  assetCheckbox.onchange = (e) => {
    handleAssetCheckboxChange(checkboxes, assetCheckbox, asset, uploads);
  };

  return assetDiv;
};
