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
} from "./State.js";
import { loadAsset, loadData, syncTimeline } from "./Datasets.js";
import { indexFile, pcFormats, processingAPI } from "./Constants.js";
import { closeGraphModal } from "./Graphs.js";

export const setupSidebar = (uploads) => {
  fetch(indexFile, { cache: "no-store" })
    .then((response) => response.text())
    .then((text) => {
      var jsonResponse = JSON.parse(text);
      setAssets(jsonResponse["assets"]);
      setDatasets(jsonResponse["datasets"]);

      if (!assets) return;

      while (document.getElementById("sidebar-data-buttons").firstChild) {
        document
          .getElementById("sidebar-data-buttons")
          .removeChild(
            document.getElementById("sidebar-data-buttons").firstChild
          );
      }

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
        });
      }

      var categories = {};
      var assetDivs = {};

      jsonResponse["categories"].map((cat) => {
        categories[cat.id] = document.createElement("div");
        categories[cat.id].id = `category-${cat.id}`;
        var accordionDiv = categories[cat.id];

        accordionDiv.className = "sidebar-item sidebar-accordion";
        accordionDiv.innerHTML = cat.name;
        accordionDiv.onclick = () => {
          accordionDiv.classList.toggle("sidebar-accordion-active");
          var panel = accordionDiv.nextElementSibling;
          if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
          } else {
            panel.style.maxHeight = panel.scrollHeight + 1 + "px";
          }
        };

        if (!uploads && cat.id !== 6) {
          //Uploads
          document
            .getElementById("sidebar-data-buttons")
            .appendChild(accordionDiv);
          var accordionPanelDiv = document.createElement("div");
          accordionPanelDiv.className = "sidebar-accordion-panel";
          document
            .getElementById("sidebar-data-buttons")
            .appendChild(accordionPanelDiv);
        }
      });

      //Add uploads accordion last to the list
      if (uploads) {
        var uploadAccordion = categories[6];
        document
          .getElementById("sidebar-data-buttons")
          .appendChild(uploadAccordion);
        var accordionPanelDiv = document.createElement("div");
        accordionPanelDiv.className = "sidebar-accordion-panel";
        document
          .getElementById("sidebar-data-buttons")
          .appendChild(accordionPanelDiv);
      }

      assets.map((asset) => {
        if (!uploads && asset.categoryID == 6) return;
        if (uploads && asset.categoryID != 6) return;

        var accordionDiv = categories[asset.categoryID];
        var accordionPanelDiv = accordionDiv.nextElementSibling;

        var assetDiv = document.createElement("div");

        var assetCheckbox = document.createElement("input");
        assetCheckbox.id = `assetCheckbox-${asset.id}`;
        assetCheckbox.type = "checkbox";
        assetCheckbox.style.float = "left";
        assetCheckbox.style.margin = "0 5px 0 0";

        var assetContentDiv = document.createElement("div");
        var assetContentDivText = document.createElement("div");
        assetContentDivText.innerHTML =
          asset["status"] !== "active"
            ? asset["name"] + ` (${asset["status"]})`
            : asset["name"];

        assetContentDivText.style["flex-grow"] = 1;

        assetContentDiv.style.padding = "0 18px";
        assetContentDiv.style.display = "flex";
        assetDiv.className = "sidebar-item";
        assetContentDiv.className = "sidebar-accordion";

        assetContentDiv.appendChild(assetCheckbox);
        assetContentDiv.appendChild(assetContentDivText);
        assetDiv.appendChild(assetContentDiv);

        var datesPanelDiv = document.createElement("div");
        datesPanelDiv.className = "sidebar-accordion-panel";

        if (asset.data && asset.data.length > 1) {
          var timeseriesDiv = document.createElement("div");
          timeseriesDiv.className = "sidebar-item";

          var timeseriesContentDiv = document.createElement("div");
          timeseriesContentDiv.style.padding = "0 36px";
          timeseriesContentDiv.innerHTML = "Time Series";

          timeseriesDiv.onclick = () => {
            assetCheckbox.indeterminate = false;
            assetCheckbox.checked = true;
            checkboxes.map((cb) => {
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
                ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
                : `/cesium/Apps/ASDC/${dataIDs}`
            );
            loadAsset(asset, true, true);
          };

          timeseriesDiv.appendChild(timeseriesContentDiv);
          datesPanelDiv.appendChild(timeseriesDiv);
        }

        if (asset.data) {
          var checkboxes = [];
          var assetDatasets = [];
          asset.data.map((dataID, index) => {
            var data = dataID;
            for (var i = 0; i < datasets.length; i++) {
              if (datasets[i].id === dataID) {
                data = datasets[i];
                data.asset = asset;
                assetDatasets.push(data);
                break;
              }
            }

            var dateDiv = document.createElement("div");
            dateDiv.className = "sidebar-item";
            dateDiv.id = `dataButton-${data.id}`;

            var checkbox = document.createElement("input");
            checkbox.id = `dataCheckbox-${data.id}`;
            checkbox.type = "checkbox";
            checkbox.style.float = "left";
            checkbox.style.margin = "0 5px 0 0";

            checkbox.checked =
              selectedDataIDs && selectedDataIDs.includes(data.id);
            checkboxes.push(checkbox);

            assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
            assetCheckbox.indeterminate =
              !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);

            checkbox.onchange = (e) => {
              assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
              assetCheckbox.indeterminate =
                !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);
              if (checkbox.checked) {
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
                    ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
                    : `/cesium/Apps/ASDC/${dataIDs}`
                );

                loadData(asset, data, true, false, true);

                if (new Date(data.date) != "Invalid Date") {
                  viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                    new Date(data.date)
                  );
                }
              } else {
                if (
                  tilesets[asset.id] &&
                  tilesets[asset.id][new Date(data.date)]
                ) {
                  if (Array.isArray(tilesets[asset.id][new Date(data.date)])) {
                    tilesets[asset.id][new Date(data.date)].map((tileset) => {
                      tileset.show = false;
                    });
                  } else {
                    tilesets[asset.id][new Date(data.date)].show = false;
                  }
                }
                if (dataSources[asset.id] && dataSources[asset.id][data.id]) {
                  dataSources[asset.id][data.id].show = false;
                }
                if (entities[asset.id]) {
                  entities[asset.id].show = false;
                }
                if (
                  imageryLayers[asset.id] &&
                  imageryLayers[asset.id][data.id]
                ) {
                  imageryLayers[asset.id][data.id].show = false;
                }
                closeGraphModal();
                setSelectedDatasets(
                  selectedDatasets.filter((d) => {
                    return d.id !== data.id;
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
                    ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
                    : `/cesium/Apps/ASDC/${dataIDs}`
                );

                if (!selectedDatasets.find((d) => d.asset === asset)) {
                  viewer.timeline._trackList.splice(
                    viewer.timeline._trackList.indexOf(
                      timelineTracks[asset["id"]]
                    ),
                    1
                  );

                  timelineTracks[asset["id"]] = null;
                  delete timelineTracks[asset["id"]];

                  viewer.timeline._makeTics();
                  viewer.timeline.container.style.bottom =
                    Object.keys(timelineTracks).length * 8 + "px";
                  viewer.timeline._trackContainer.style.height =
                    Object.keys(timelineTracks).length * 8 + 1 + "px";
                }

                if (
                  timelineTracks[asset["id"]] &&
                  timelineTracks[asset["id"]].intervals
                ) {
                  timelineTracks[asset["id"]].intervals.map((t) => {
                    if (
                      Cesium.JulianDate.toDate(t.start).getTime() ===
                      new Date(data.date).getTime()
                    ) {
                      timelineTracks[asset["id"]].intervals.splice(
                        timelineTracks[asset["id"]].intervals.indexOf(t),
                        1
                      );
                    }
                  });
                  viewer.timeline._makeTics();
                }
              }
              syncTimeline(false);
            };

            var dateContentDiv = document.createElement("div");
            dateContentDiv.style.padding = "0 36px";

            if (data.date) {
              var date = new Date(data.date);
              dateContentDiv.innerHTML =
                date.toString() !== "Invalid Date"
                  ? new Date(data.date).toLocaleDateString("en-au", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })
                  : data.date;
            } else {
              dateContentDiv.innerHTML = "No Date";
            }

            dateDiv.onclick = (e) => {
              if (e && e.target === checkbox) {
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
                  ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
                  : `/cesium/Apps/ASDC/${dataIDs}`
              );

              loadData(asset, data, true, true, true);
            };

            dateContentDiv.appendChild(checkbox);
            dateDiv.appendChild(dateContentDiv);
            datesPanelDiv.appendChild(dateDiv);

            if (
              (data.type != "EPTPointCloud" && data.source) ||
              data.type === "Influx" ||
              data.type === "GeoJSON"
            ) {
              var downloadBtn = document.createElement("div");
              downloadBtn.className = "dlBtn fa fa-download";
              downloadBtn.style.float = "right";

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

                if (data.type === "PointCloud") {
                  pcFormats.map((format) => {
                    dlDropdown.children["dl-" + format].style.display = "block";
                    dlDropdown.children["dl-" + format].onclick = () => {
                      downloadFile(asset, data, index, format);
                    };
                  });
                  dlDropdown.children["dl-geojson"].style.display = "none";
                  dlDropdown.children["dl-gltf"].style.display = "none";
                  dlDropdown.children["dl-json"].style.display = "none";
                } else if (data.type === "GeoJSON") {
                  pcFormats.map((format) => {
                    dlDropdown.children["dl-" + format].style.display = "none";
                  });
                  dlDropdown.children["dl-geojson"].style.display = "block";
                  dlDropdown.children["dl-geojson"].onclick = () => {
                    downloadFile(asset, data, index, data.type);
                  };
                  dlDropdown.children["dl-gltf"].style.display = "none";
                  dlDropdown.children["dl-json"].style.display = "none";
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
                }
              };

              downloadBtn.onmouseleave = (evt) => {
                dlDropdown.style.display = "none";
                downloadBtn.style.color = "black";
              };

              dateContentDiv.appendChild(downloadBtn);
            }
          });
        }

        assetCheckbox.onchange = (e) => {
          checkboxes.map((cb) => {
            cb.checked = assetCheckbox.checked;
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
                ? `/cesium/Apps/ASDC/Uploads/${dataIDs}`
                : `/cesium/Apps/ASDC/${dataIDs}`
            );
            loadAsset(asset, false, true);
          } else {
            selectedDatasets.map((d) => {
              if (d.asset.id === asset.id) {
                if (
                  tilesets[d.asset.id] &&
                  tilesets[d.asset.id][new Date(d.date)]
                ) {
                  if (Array.isArray(tilesets[d.asset.id][new Date(d.date)])) {
                    tilesets[d.asset.id][new Date(d.date)].map((tileset) => {
                      tileset.show = false;
                    });
                  } else {
                    tilesets[d.asset.id][new Date(d.date)].show = false;
                  }
                }
                if (dataSources[d.asset.id] && dataSources[d.asset.id][d.id]) {
                  dataSources[d.asset.id][d.id].show = false;
                }
                if (entities[asset["id"]]) {
                  entities[asset["id"]].show = false;
                }
                if (
                  imageryLayers[asset.id] &&
                  imageryLayers[asset.id][data.id]
                ) {
                  imageryLayers[asset.id][data.id].show = false;
                }
                closeGraphModal();
              }
            });
            setSelectedDatasets(
              selectedDatasets.filter((d) => {
                return d.asset.id !== asset.id;
              })
            );
            // if (!selectedDatasets.find(d=>selectedAssetIDs.includes(d.asset.id))) {
            setSelectedAssetIDs(
              selectedAssetIDs.filter((a) => {
                return a !== data.asset.id;
              })
            );
            // }

            var dataIDs = [];
            selectedDatasets.map((d) => {
              dataIDs.push(d.id);
            });

            dataIDs.sort((a, b) => a - b);

            window.history.pushState(
              "",
              "",
              uploads
                ? `/cesium/Apps/ASDC/Uploads/${dataIDs.join("&")}`
                : `/cesium/Apps/ASDC/${dataIDs.join("&")}`
            );

            if (
              viewer.timeline._trackList.indexOf(timelineTracks[asset["id"]]) !=
              -1
            ) {
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
          }
          syncTimeline(true);
        };

        assetDiv.onclick = (e) => {
          if (e && e.target === assetCheckbox) return;
          assetContentDiv.classList.toggle("sidebar-accordion-active");

          if (datesPanelDiv.style.maxHeight) {
            datesPanelDiv.style.maxHeight = null;
          } else {
            datesPanelDiv.style.maxHeight =
              datesPanelDiv.scrollHeight + 1 + "px";
          }

          accordionPanelDiv.style.maxHeight =
            parseFloat(accordionPanelDiv.style.maxHeight.slice(0, -2)) +
            datesPanelDiv.scrollHeight +
            "px";
        };

        accordionPanelDiv.appendChild(assetDiv);
        accordionPanelDiv.appendChild(datesPanelDiv);

        assetDivs[asset.id] = assetDiv;

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

            if (!viewer.dataSources.contains(markersDataSource)) {
              markersDataSource.entities.add({
                position: position,
                billboard: {
                  image: pinBuilder
                    .fromColor(Cesium.Color.fromCssColorString("#5B8B51"), 48)
                    .toDataURL(),
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                id: "marker_" + asset.id,
              });
            }
          }
        }
      });

      if (!viewer.dataSources.contains(markersDataSource)) {
        viewer.dataSources.add(markersDataSource);

        setTimeout(() => {
          markersDataSource.clustering.pixelRange = 0;
        }, 0);
      }

      if (selectedDataIDs) {
        var assetIDs = [];
        var selectedCats = [];
        var newSelectedDatasets = [];
        selectedDataIDs.map((dataID, index) => {
          var asset;
          for (var i = 0; i < assets.length; i++) {
            if (assets[i].data && assets[i].data.includes(parseInt(dataID))) {
              asset = assets[i];
              if (!assetIDs.includes(assets[i]["id"])) {
                assetIDs.push(assets[i]["id"]);
              }
              if (!selectedCats.includes(asset.categoryID)) {
                selectedCats.push(asset.categoryID);
              }
              break;
            }
          }
          for (var i = 0; i < datasets.length; i++) {
            if (datasets[i].id === parseInt(dataID)) {
              newSelectedDatasets.push(datasets[i]);
              loadData(asset, datasets[i], index == 0, false, true);
              break;
            }
          }
        });

        selectedCats.map((c) => {
          categories[c].onclick();
        });

        assetIDs.map((a) => {
          assetDivs[a].onclick();
        });

        setSelectedDatasets(newSelectedDatasets);
        syncTimeline(true);

        setSelectedAssetIDs(assetIDs);
      }
    });
};

export const downloadFile = (asset, data, index, format) => {
  var waitModal = document.getElementById("processing-wait-modal");

  if (pcFormats.includes(format)) {
    waitModal.style.display = "block";
    fetch(
      `${processingAPI}/download?` +
        new URLSearchParams({
          assetID: asset.id,
          dataIndex: index,
          format: format,
        }),
      { cache: "no-store" }
    )
      .then((response) => response.text())
      .then((text) => {
        waitModal.style.display = "none";
        var link = document.createElement("a");
        link.href = text;
        waitModal.style.display = "none";
        link.click();
        link.remove();
      })
      .catch((err) => {
        alert(err);
        waitModal.style.display = "none";
      });
  } else if (data.type === "GeoJSON") {
    if (data.url.endsWith(".geojson")) {
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
      fetch(
        `${processingAPI}/download?` +
          new URLSearchParams({
            assetID: asset.id,
            dataIndex: index,
            format: "zip",
          }),
        { cache: "no-store" }
      )
        .then((response) => response.text())
        .then((text) => {
          var link = document.createElement("a");
          link.href = text;
          waitModal.style.display = "none";
          link.click();
          link.remove();
        })
        .catch((err) => {
          alert(err);
          waitModal.style.display = "none";
        });
    }
  } else if (data.type === "Influx") {
    waitModal.style.display = "block";
    fetch(`/cesium/influx/fivemin?station=${data.station}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((parsedResponse) => {
        fetch(`/cesium/influx/daily?station=${data.station}`, {
          cache: "no-store",
        })
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
