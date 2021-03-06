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
  sharedDivs
} from "./State.js";
import { loadAsset, loadData, syncTimeline } from "./Datasets.js";
import { pcFormats, processingAPI } from "./Constants.js";
import { closeGraphModal } from "./Graphs.js";
import { applyAlpha, getAlpha } from "./Style.js";

export const setupSidebar = (uploads, indexParam=false) => {
  if (!assets) return;
  var sidebarDataButtons = document.getElementById("sidebar-data-buttons");

  createMarkersDataSource();
  var togglePublicData = false;
  if (!uploads && !publicTask && !indexParam){
    if (Object.keys(sourceDivs).length==0){
      var sources = ["Public Data", "WebODM Projects"];

      var sharedODMAssetsExist = false
      if(init && init.index && init.index.categories && init.index.categories.length){//
      // if(init && init.index && init.index.categories && !sourceDivs["Shared WebODM Datasets"]){//
      // if(init && init.index){
        //// sources.push(init.index.source);
        sources.push("Shared WebODM Datasets");
        sharedODMAssetsExist=true;
      }
      sources.map(s=>{
        sourceDivs[s] = createAccordion(s);
        sourceDivs[s].id = `source-${s}`
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
      })
      togglePublicData=true;
      categories.map((cat) => {
        categoryDivs[cat.id] = createAccordion(cat.name,18);
        categoryDivs[cat.id].id = `category-${cat.id}`;
        //Uploads page
        if (((!uploads && cat.id !== 6)|| (uploads && cat.id == 6))) {
          sourceDivs["Public Data"].nextElementSibling.appendChild(categoryDivs[cat.id]);
          var accordionPanelDiv = document.createElement("div");
          accordionPanelDiv.className = "sidebar-accordion-panel";
          sourceDivs["Public Data"].nextElementSibling.appendChild(accordionPanelDiv);
        }
      });
    }
  } else {
      categories.map((cat) => {
        if ((uploads && cat.id == 6) || publicTask || indexParam) {
          categoryDivs[cat.id] = createAccordion(cat.name,18);
          categoryDivs[cat.id].id = `category-${cat.id}`;
          sidebarDataButtons.appendChild(categoryDivs[cat.id]);
          var accordionPanelDiv = document.createElement("div");
          accordionPanelDiv.className = "sidebar-accordion-panel";
          sidebarDataButtons.appendChild(accordionPanelDiv);
        }
      })
  }

  if(sharedODMAssetsExist){
    init.index.categories.map(c=>{
      sharedDivs[c.id] = createAccordion(c.name, 18);
      sharedDivs[c.id].id = `shared-${c.id}`;
      sourceDivs["Shared WebODM Datasets"].nextElementSibling.appendChild(sharedDivs[c.id]);
      var accordionPanelDiv = document.createElement("div");
      accordionPanelDiv.className = "sidebar-accordion-panel";
      sourceDivs["Shared WebODM Datasets"].nextElementSibling.appendChild(accordionPanelDiv);
    })
  }
  if (!uploads && Array.isArray(odmProjects)) {
    odmProjects.map(odmProject => {
      if (projectDivs[odmProject.id]) return
      projectDivs[odmProject.id] = createAccordion(odmProject.name, 18);
      projectDivs[odmProject.id].id = `project-${odmProject.id}`;

      const oldProjectClick = projectDivs[odmProject.id].onclick;
      projectDivs[odmProject.id].onclick=()=>{
        oldProjectClick();
        var projectAssets = assets.filter(a=>a.project==odmProject.id && a.categoryID==-1);
        projectAssets.map(asset=>{
          var assetDatasets = [];
          asset?.data?.map((dataID, index) => {
            for (var i = 0; i < datasets.length; i++) {
              if (datasets[i].id == dataID) {
                assetDatasets.push(datasets[i]);
              }
            }
          })

          if (projectDivs[odmProject.id].firstChild.classList.contains("sidebar-accordion-active")){
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
        })
        // setTimeout(() => {
        //   markersDataSource.clustering.pixelRange = 0;
        // }, 0);
      }
      var projectAssets = assets.filter(a=>a.project==odmProject.id);
      var projectOpacityBtn = createProjectOpacitySliderBtn(projectAssets,projectDivs[odmProject.id]);
      projectDivs[odmProject.id].firstChild.appendChild(projectOpacityBtn);

      var sourcePanelDiv = sourceDivs["WebODM Projects"].nextElementSibling;
      sourcePanelDiv.appendChild(projectDivs[odmProject.id]);

      var projectsPanelDiv = document.createElement("div");
      projectsPanelDiv.className = "sidebar-accordion-panel";
      sourcePanelDiv.appendChild(projectsPanelDiv);

      var projectTasks = assets.filter(a=> a.project === odmProject.id);
      var suffixes = ["pc","op","dtm","dsm"];

      suffixes.map(suffix=>{
        if (!!projectTasks.find(p=>p.data.find(d=>d.endsWith("-" + suffix)))){
          var layerDiv = document.createElement("div");
          layerDiv.className = "sidebar-item";
          var layerContentDiv = document.createElement("div");
          layerContentDiv.style.padding = "0 54px";
          layerContentDiv.innerHTML = "All " + (suffix == "pc" ? "Point Clouds":
            suffix == "op" ? "Orthophotos" : suffix == "dtm" ? "DTMs" : suffix == "dsm" ? "DSMs": null); 

          var layerCheckBox = document.createElement("input");
          layerCheckBox.type = "checkbox";
          layerCheckBox.id = `layerCheckbox-${odmProject.id}-${suffix}`;
          layerCheckBox.style.float = "left";
          layerCheckBox.style.margin = "0 5px 0 0";
          var projectLayerDataIDs = [];
          projectTasks.map(asset=>{
            asset.data.map(dataID=>{
              if (dataID.endsWith("-" + suffix)) {
                projectLayerDataIDs.push(dataID);
              }
            })
          });
          layerCheckBox.checked = projectLayerDataIDs.every(id=>selectedDataIDs.includes(id))
          layerContentDiv.appendChild(layerCheckBox);
          layerDiv.appendChild(layerContentDiv);
  
          layerDiv.onclick = (e)=>{
            if (e && e.target==layerCheckBox) return;
            projectTasks.map(asset=>{
              asset.data.map(dataID=>{
                if (dataID.endsWith("-" + suffix)) {
                  var data = datasets.find(d=>d.id === dataID && d.asset.categoryID!=-3);
                  layerCheckBox.checked=true;
                  document.getElementById(`dataButton-${data.id}`).onclick();
                }
              })
            });
          }

          layerCheckBox.onchange = (e) =>{
            if (e && e.target!=layerCheckBox) return;
            if(layerCheckBox.checked){
              layerDiv.onclick();
            } else {
              projectTasks.map(asset=>{
                asset.data.map(dataID=>{
                  if (dataID.endsWith("-" + suffix)) {
                    var data = datasets.find(d=>d.id === dataID && d.asset.categoryID!=-3);
                    var checkbox  = sourceDivs["WebODM Projects"].nextElementSibling.querySelector(`#dataCheckbox-${data.id}`);
                    checkbox.checked=false;
                    checkbox.onchange();
                  }
                })
              });
            }
          }

          projectsPanelDiv.appendChild(layerDiv);
        }
      })
    })
    if (sourceDivs["WebODM Projects"].nextElementSibling.firstChild.className === "loader-parent"){
      sourceDivs["WebODM Projects"].nextElementSibling.removeChild(sourceDivs["WebODM Projects"].nextElementSibling.firstChild);
    }
    if (sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight){
      var height = 0;
      var children = [...sourceDivs["WebODM Projects"].nextElementSibling.children];
      for(var i=0;i<children.length;i++){
        if (children[i].style.maxHeight){
          height+=parseFloat(children[i].style.maxHeight.slice(0,-2));
        } else {
          height+=children[i].scrollHeight + children[i].getBoundingClientRect().height;
        }
      }
      sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight = height + "px";
    }
  } 

  assets.map((asset) => {
    if (!!assetDivs[asset.id]) return;
    if (!uploads && asset.categoryID == 6) return;
    if (uploads && asset.categoryID != 6) return;

    if (asset.categoryID == -1) {
      var accordionDiv = projectDivs[asset.project];
      var accordionPanelDiv = projectDivs[asset.project].nextElementSibling;
    } else  if (asset.categoryID == -3) {
      var accordionDiv = sharedDivs[asset.project];
      var accordionPanelDiv = sharedDivs[asset.project].nextElementSibling;
    } else {
      var accordionDiv = categoryDivs[asset.categoryID];
      var accordionPanelDiv = accordionDiv.nextElementSibling;

      if (!uploads && !publicTask && !indexParam && sourceDivs["Public Data"].nextElementSibling.firstChild.className === "loader-parent"){
        sourceDivs["Public Data"].nextElementSibling.removeChild(sourceDivs["Public Data"].nextElementSibling.firstChild);
        
        if (sourceDivs["Shared WebODM Datasets"]){
          sourceDivs["Shared WebODM Datasets"].nextElementSibling.removeChild(sourceDivs["Shared WebODM Datasets"].nextElementSibling.firstChild);
        }
      }
    }

    var datesPanelDiv = document.createElement("div");
    datesPanelDiv.className = "sidebar-accordion-panel";

    if (asset.categoryID == -1 || asset.categoryID == -2) {
      var metadataDiv = document.createElement("div");
      metadataDiv.className = "sidebar-text";
      var taskInfo = taskInfos[asset.taskID]
      metadataDiv.innerHTML = 
      `<table>
      <tr><td><strong> Created on: </strong></td><td>${new Date(taskInfo.created_at).toLocaleString('en-au', {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'})}</td></tr>
      ${taskInfo.processing_node_name ? `<tr><td><strong>Processing Node: </strong></td><td>${taskInfo.processing_node_name}</td></tr>`: ""}
      ${taskInfo.options ? `<tr><td><strong>Options: </strong></td><td>${taskInfo.options.map(o=>`${o.name} : ${o.value}`)}</td></tr>` : ""}
      ${taskInfo.statistics.pointcloud ? `<tr><td><strong>Average GSD: </strong></td><td>${Math.round(taskInfo.statistics.gsd*100)/100} cm</td></tr>`: ""}
      ${taskInfo.statistics.pointcloud ? `<tr><td><strong>Area: </strong></td><td>${Math.round(taskInfo.statistics.area*100)/100} m??</td></tr>`: ""}
      ${taskInfo.statistics.pointcloud ? `<tr><td><strong>Reconstructed Points: </strong></td><td>${taskInfo.statistics.pointcloud.points}</td></tr>` : ""}
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
    })
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

export const loadSelectedDataIDs = (fly)=>{
  if (selectedDataIDs && selectedDataIDs.length!=0) {
    var assetIDs = [];
    var selectedCats = [];
    var selectedProjects = [];
    var newSelectedDatasets = [...selectedDatasets];
    var sharedProjects = [];
    
    selectedDataIDs.map((dataID, index) => {
      if (selectedDatasets.find(d=>d.id==dataID)) return;

      var asset;
      for (var i = 0; i < assets.length; i++) {
        if (assets[i].data && (!!assets[i].data.find(d => d.toString() == dataID))) {
          asset = assets[i];
          break;
        }
      }
      if(asset){
        var data;
        for (var i = 0; i < datasets.length; i++) {
          if (datasets[i].id == dataID) {
            data = datasets[i];
            break;
          }
        }

        if (data){
          if ((tilesets[data.asset.id] && tilesets[data.asset.id][data.id]) || 
          (imageryLayers[data.asset.id] && imageryLayers[data.asset.id][data.id]) || 
          (dataSources[data.asset.id] && dataSources[data.asset.id][data.id])
          ) return;

          var dataCheckbox = document.getElementById(`dataCheckbox-${dataID}`);
          if (dataCheckbox){
            dataCheckbox.checked=true;
          }

          newSelectedDatasets.push(datasets[i]);
          loadData(asset, datasets[i], fly && index == 0, false, true);

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
            if (!sharedProjects.includes(asset.project)){
              sharedProjects.push(asset.project)
            }
          }
  
          var assetCheckbox = document.getElementById(
            `assetCheckbox-${asset.id}`
          );
          if (asset.data.every(ad => selectedDataIDs.includes(ad.toString()) || selectedDataIDs.includes(ad))){
              assetCheckbox.checked = true;
              assetCheckbox.indeterminate = false;
          } else {
            assetCheckbox.checked = false;
            if (asset.data.some(ad => selectedDataIDs.includes(ad.toString()) || selectedDataIDs.includes(ad))){
              assetCheckbox.indeterminate = true;
            } else {
              assetCheckbox.indeterminate = false;
            }
          }
        }
      }
    });

    selectedCats.map((c) => {
      if (c!=-1 && c!=-3) {
        if (!categoryDivs[c].firstChild.classList.contains("sidebar-accordion-active")){
          categoryDivs[c].onclick();
        }
      } else {
        var sourceDiv;
        if (c==-1){
          sourceDiv = sourceDivs["WebODM Projects"];
        } else if (c==-3) {
          sourceDiv = sourceDivs["Shared WebODM Datasets"];
        }
        sourceDiv.firstChild.classList.add("sidebar-accordion-active");
        var panel = sourceDiv.nextElementSibling;
        panel.style.maxHeight = "fit-content";
        var height=0;
        var children = [...panel.children];
        for (var i=0;i<children.length;i++) {
          height+=children[i].scrollHeight + children[i].getBoundingClientRect().height;
        }
        
        panel.style.maxHeight = height + "px";

        var elem = panel.parentElement;
        while (elem) {      
          var height = 0;
          var children = [...elem.children];
          for(var i=0;i<children.length;i++){
            if (children[i].style.maxHeight){
              height+=parseFloat(children[i].style.maxHeight.slice(0,-2));
            } else {
              height+=children[i].scrollHeight + children[i].getBoundingClientRect().height;
            }
          }
          elem.style.maxHeight = height + "px";

          elem = elem.parentElement;
        }
      }
    });

    selectedProjects.map(p => {
      projectDivs[p].onclick();
    })

    sharedProjects.map(p => {
      if (!sharedDivs[p].firstChild.classList.contains("sidebar-accordion-active")){
        sharedDivs[p].onclick();
      }
    })

    assetIDs.map((a) => {
      if (!assetDivs[a].firstChild.classList.contains("sidebar-accordion-active")){
        assetDivs[a].onclick();
      }
    });

    setSelectedDatasets(newSelectedDatasets);
    syncTimeline(true);

    setSelectedAssetIDs(assetIDs);
  }
}

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
      }

      var link = document.createElement("a");
      var url = new URL(`${processingAPI}/download`);
      url.search = new URLSearchParams(params);
      link.href = url;
      link.click();
      link.remove();
      
      var cookieTimer = setInterval( checkCookies, 500 );
      function checkCookies() {
        if (document.cookie){
          var cookies = document.cookie.split(';')
          .map(v => v.split('='))
          .reduce((acc, v) => {
            if (v[0] && v[1]) {
              acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            }
            return acc;
          }, {})
          if (cookies[data.source.url  + `_${format}`]){
            waitModal.style.display = "none";
            document.cookie = data.source.url + `_${format}` + "= ; Path=/ ; expires = " + new Date().toUTCString();
            clearInterval( cookieTimer );
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
      
      var cookieTimer = setInterval( checkCookies, 500 );
      function checkCookies() {
        if (document.cookie){
          var cookies = document.cookie.split(';')
          .map(v => v.split('='))
          .reduce((acc, v) => {
            if (v[0] && v[1]) {
              acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            }
            return acc;
          }, {})
          if (cookies[data.source[0].url  + `_zip`]){
            waitModal.style.display = "none";
            document.cookie = data.source[0].url + `_zip` + "= ; Path=/ ; expires = " + new Date().toUTCString();
            clearInterval( cookieTimer );
          }
        }
      }
    }
  } else if (data.type === "Influx") {
    waitModal.style.display = "block";
    fetch(
      `/cesium/influx/fivemin?station=${data.station
      }&time=${Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime()}`,
      {
        cache: "no-store",
      }
    )
      .then((response) => response.json())
      .then((parsedResponse) => {
        fetch(
          `/cesium/influx/daily?station=${data.station
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
  accordionContentDivText.innerHTML = name
  accordionContentDivText.style["flex-grow"] = 1;
  accordionContentDivText.style["overflow"] = 'hidden';
  accordionContentDivText.style["text-overflow"] = 'ellipsis';
  accordionContentDivText.style["overflow-wrap"] = 'break-word';

  accordionContentDiv.appendChild(accordionContentDivText);
  accordionDiv.appendChild(accordionContentDiv);

  accordionDiv.onclick = (e) => {
    if (e && e.target.nodeName == "INPUT") return
    accordionContentDiv.classList.toggle("sidebar-accordion-active");
    var panel = accordionDiv.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      // panel.style.maxHeight = "fit-content";
      var height=0;
      var children = [...panel.children];
      for (var i=0;i<children.length;i++) {
        height+=children[i].scrollHeight + children[i].getBoundingClientRect().height;
      }
      
      panel.style.maxHeight = height + "px";
    }

    var elem = panel.parentElement;
    while (elem && elem.id != "sidebar" && elem.id != "sidebar-data-buttons") {
      // elem.style.maxHeight = 'fit-content';
      
      var height = 0;
      var children = [...elem.children];
      for(var i=0;i<children.length;i++){
        if (children[i].style.maxHeight){
          height+=parseFloat(children[i].style.maxHeight.slice(0,-2));
        } else {
          height+=children[i].scrollHeight + children[i].getBoundingClientRect().height;
        }
      }
      elem.style.maxHeight = height + "px";

      elem = elem.parentElement;
    }
  };
  return accordionDiv;
}

const handleDataCheckboxChange = (checkbox, assetCheckbox, checkboxes, asset, data, uploads) => {
  assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
  assetCheckbox.indeterminate =
    !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);

  if(asset.project){
    var suffix =data.id.split("-")[data.id.split("-").length-1];
    var layerCheckBox = document.getElementById(`layerCheckbox-${asset.project}-${suffix}`);
    if (layerCheckBox) {
      var projectLayerDataIDs = [];
      asset.data.map(dataID=>{
        if (dataID.endsWith("-" + suffix)) {
          projectLayerDataIDs.push(dataID);
        }
      })
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

    var dataIDs = newDataIDs.join('&');

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` + window.location.search + window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` + window.location.search + window.location.hash
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
      tilesets[asset.id][data.id]
    ) {
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
    if (
      imageryLayers[asset.id] &&
      imageryLayers[asset.id][data.id]
    ) {
      imageryLayers[asset.id][data.id].show = false;
    }
    if (data["type"] == "Influx" || data["type"] == "CSV") {
      var container = document.getElementById("graphs-container");
      
      const children = [...container.children];
      for (var i=0;i<children.length;i++){
        if (children[i].id.startsWith(`graph_${data.id}`)){
          container.removeChild(children[i]);
        }
      }
    }

    if (data["type"] == "ImageSeries") {
      document.getElementById(
        "image-series-toolbar-row"
      ).style.display = "none";
    }
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

    if (
      !selectedDatasets.find((d) =>
        d.type == "Influx" || d.type =="CSV"
      )
    ) {
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

    var dataIDs = newDataIDs.join('&')

    window.history.pushState(
      "",
      "",
      uploads
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` + window.location.search + window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` + window.location.search + window.location.hash
    );

    if (!selectedDatasets.find((d) => d.asset === asset)) {
      if (timelineTracks[asset["id"]]){
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
    }
    if (
      timelineTracks[asset["id"]] &&
      timelineTracks[asset["id"]].intervals
    ) {
      timelineTracks[asset["id"]].intervals.map((t) => {
        if (
          Cesium.JulianDate.toDate(t.start).getTime() ===
          new Date(data.date).getTime() &&
          !selectedDatasets.find((d) => d.asset.id === asset.id &&
          new Date(d.date).getTime()==new Date(data.date).getTime()
          )
        ) {
          timelineTracks[asset["id"]].intervals.splice(
            timelineTracks[asset["id"]].intervals.indexOf(t),
            1
          );
        }
      });
      viewer.timeline._makeTics();
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
  syncTimeline(false);
  
  if (layerCheckBox){
    layerCheckBox.checked = projectLayerDataIDs.every(id=>selectedDatasets.find(d=>d.id==id))
  }
}

const handleAssetCheckboxChange = (checkboxes, assetCheckbox, asset, uploads) => {
  checkboxes.map((cb) => {
    cb.checked = assetCheckbox.checked;
  });
  if (assetCheckbox.checked) {
    console.log("here");
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
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` + window.location.search + window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` + window.location.search + window.location.hash
    );
    loadAsset(asset, false, true);
    
    var firstAssetData = selectedDatasets.find(d=>d.asset.id==asset.id);
    if (firstAssetData && firstAssetData.type!="Influx" && firstAssetData.type!="ImageSeries"){
      syncTimeline(true);
    }
  } else {
    selectedDatasets.map((d) => {
      if (d.asset.id === asset.id) {
        if (
          tilesets[d.asset.id] &&
          tilesets[d.asset.id][d.id]
        ) {
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
        if (
          imageryLayers[d.asset.id] &&
          imageryLayers[d.asset.id][d.id]
        ) {
          imageryLayers[d.asset.id][d.id].show = false;
        }
        if (d["type"] == "Influx" || d["type"] == "CSV") {
          var container = document.getElementById("graphs-container");
          
          const children = [...container.children];
          for (var i=0;i<children.length;i++){
            if (children[i].id.startsWith(`graph_${d.id}`)){
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

    if (!selectedDatasets.find((d) => d.type === "Influx" || d.type === "CSV")) {
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
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs.join("&")}` + window.location.search + window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs.join("&")}` + window.location.search + window.location.hash
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

    syncTimeline(true);
  }
}

const createZoomButton = (asset, data) => {
  var zoomButton = document.createElement("div");
  zoomButton.className = "fa fa-video-camera zoom-button";
  zoomButton.onclick = (evt) => {
    if (entities[asset.id] && entities[asset.id][data.id]) {
      Cesium.sampleTerrainMostDetailed(
        viewer.terrainProvider,
        Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(
            entities[asset.id][
              data.id
            ].polygon.hierarchy.getValue().positions
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
              0)
          }
        );
      });
    }
  };
  return zoomButton;
}

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
        ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` + window.location.search + window.location.hash
        : `/cesium/Apps/ASDC/${dataIDs}` + window.location.search + window.location.hash
    );
    loadAsset(asset, true, true);
  };

  timeseriesDiv.appendChild(timeseriesContentDiv);

  return timeseriesDiv;
}

const createOpacitySliderBtn = (asset, data, dateDiv) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";

  var opacityDropdown = document.getElementById(
    "alpha-slider-container"
  );

  opacitySliderBtn.onmouseover = (evt) => {
    var alpha = getAlpha(asset,data);

    document.getElementById("alpha-slider").value = Math.round(
      alpha * 100
    );
    document.getElementById("alpha-value").innerHTML =
      document.getElementById("alpha-slider").value + " %";

    var rect = evt.target.getBoundingClientRect();
    opacityDropdown.style.left = rect.x + (rect.width/2) +"px";
    opacityDropdown.style.top = rect.y + (rect.height/2) +"px";
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

    document.getElementById("alpha-slider").oninput = (event) =>{
      document.getElementById("alpha-value").innerHTML = event.target.value + " %";
      applyAlpha(event.target.value / 100, asset, data);
    }
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
}

const createAssetOpacitySliderBtn = (asset, dateDiv,assetDatasets) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";

  var opacityDropdown = document.getElementById(
    "alpha-slider-container"
  );
  
  opacitySliderBtn.onmouseover = (evt) => {
    var alphas = [];
    assetDatasets.map(data=>{
      var alpha = getAlpha(asset,data);
      if (alpha!=undefined){
        alphas.push(alpha);
      }
    })

    if (alphas.length!=0 && alphas.every(a=>a==alphas[0])){
      document.getElementById("alpha-slider").value = alphas[0] * 100;
      document.getElementById("alpha-value").value = alphas[0] * 100 + " %";;
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
      opacityDropdown.style.left = rect.x + (rect.width/2) +"px";
      opacityDropdown.style.top = rect.y + (rect.height/2) +"px";

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

      document.getElementById("alpha-slider").oninput = (event) =>{
        assetDatasets.map(data=>{
            document.getElementById("alpha-value").innerHTML = event.target.value + " %";
            var alpha = event.target.value / 100;
            applyAlpha(alpha, asset, data);
          }
        )
      }
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
}

const createProjectOpacitySliderBtn = (projectAssets, projectDiv) => {
  var opacitySliderBtn = document.createElement("div");
  opacitySliderBtn.className = "fa fa-sliders";
  opacitySliderBtn.style.float = "right";
  opacitySliderBtn.style.height = "fit-content";

  var opacityDropdown = document.getElementById(
    "alpha-slider-container"
  );
  
  opacitySliderBtn.onmouseover = (evt) => {
    var alphas = [];
    projectAssets.map(asset=>{
      var assetDatasets = [];
      asset?.data?.map((dataID, index) => {
        for (var i = 0; i < datasets.length; i++) {
          if (datasets[i].id == dataID) {
            assetDatasets.push(datasets[i]);
          }
        }
      })

      assetDatasets.map(data=>{
        var alpha = getAlpha(asset,data);
        if (alpha!=undefined){
          alphas.push(alpha);
        }
      })
    })

    if (alphas.length!=0 && alphas.every(a=>a==alphas[0])){
      document.getElementById("alpha-slider").value = alphas[0] * 100;
      document.getElementById("alpha-value").value = alphas[0] * 100 + " %";;
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
    opacityDropdown.style.left = rect.x + (rect.width/2) +"px";
    opacityDropdown.style.top = rect.y + (rect.height/2) +"px";

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

    document.getElementById("alpha-slider").oninput = (event) =>{
      projectAssets.map(asset=>{
        var assetDatasets = [];
        asset?.data?.map((dataID, index) => {
          for (var i = 0; i < datasets.length; i++) {
            if (datasets[i].id == dataID) {
              assetDatasets.push(datasets[i]);
            }
          }
        })
        assetDatasets.map(data=>{
            document.getElementById("alpha-value").innerHTML = event.target.value + " %";
            var alpha = event.target.value / 100;
            applyAlpha(alpha, asset, data);
          }
        )
      })
    }
  };
  opacitySliderBtn.onmouseleave = (evt) => {
    opacityDropdown.style.display = "none";
    opacitySliderBtn.style.color = "black";
  };
  return opacitySliderBtn;
}

const createDownloadBtn = (asset, data, dateDiv, index) => {
  var downloadBtn = document.createElement("div");
  downloadBtn.className = "fa fa-download";
  downloadBtn.style.float = "right";
  downloadBtn.style.paddingLeft = "10px";

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
    (document.getElementById("nav-header") ? document.getElementById("nav-header").offsetHeight:0) +
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

    if (
      data.type === "PointCloud" ||
      data.type === "EPTPointCloud"
    ) {
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
}

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
      var data = datasets.find(d=>d.id==id)

      if (data.bounds){
        var rect = new Cesium.Rectangle.fromDegrees(
          data.bounds[0],
          data.bounds[1],
          data.bounds[2],
          data.bounds[3]
        );

        var rectBoundingSphere = Cesium.BoundingSphere.fromPoints(Cesium.Rectangle.subsample(rect));
      }

      cluster.billboard.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        data.boundingSphereRadius
          ? data.boundingSphereRadius * 4
          : data.bounds ? rectBoundingSphere.radius * 4:
          2500,
        Number.MAX_VALUE
      );
    });
  }
}

const createAssetDiv = (asset, uploads, datesPanelDiv) => {
  var assetDiv = createAccordion(asset.name, 36);  
  var assetCheckbox = document.createElement("input");
  assetCheckbox.id = `assetCheckbox-${asset.id}`;
  assetCheckbox.type = "checkbox";
  assetCheckbox.style.float = "left";
  assetCheckbox.style.margin = "0 5px 0 0";

  assetDiv.firstChild.prepend(assetCheckbox);

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
      
      if(!data)return
      var dateDiv = document.createElement("div");
      dateDiv.className = "sidebar-item";
      dateDiv.id = `dataButton-${data.id}`;

      var checkbox = document.createElement("input");
      checkbox.id = `dataCheckbox-${data.id}`;
      checkbox.type = "checkbox";
      checkbox.style.float = "left";
      checkbox.style.margin = "0 5px 0 0";
      
      if (init && init.index && data && data.asset && data.asset.project){
        checkbox.checked =
          selectedDataIDs && (selectedDataIDs.includes(data.id.toString()) && data.asset.categoryID==-3);
      } else {
        checkbox.checked =
          selectedDataIDs && (selectedDataIDs.includes(data.id.toString()));
      }
      
      checkboxes.push(checkbox);

      assetCheckbox.checked = checkboxes.every((cb) => cb.checked);
      assetCheckbox.indeterminate =
        !assetCheckbox.checked && checkboxes.some((cb) => cb.checked);

      checkbox.onchange = (e) => {
        handleDataCheckboxChange(checkbox, assetCheckbox, checkboxes, asset, data, uploads)
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

      if (data.type === "ImageSeries") {
        var zoomButton = createZoomButton(asset, data);
        dateContentDiv.appendChild(zoomButton);
      }

      dateDiv.onclick = (e) => {
        if (e && (e.target === checkbox || e.target === zoomButton)) {
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
            ? `/cesium/Apps/ASDC/Uploads/${dataIDs}` + window.location.search + window.location.hash
            : `/cesium/Apps/ASDC/${dataIDs}` + window.location.search + window.location.hash
        );

        loadData(asset, data, true, true, true);

        if (data.type === "Influx" || data.type==="CSV"){
          var container = document.getElementById("graphs-container");
          
          const children = [...container.children];
          for (var i=0;i<children.length;i++){
            if (children[i].id.startsWith(`graph_${data.id}`)){
              children[i].scrollIntoView({behavior: "smooth"});
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
        data.source && (data.source.downloadable==undefined || data.source.downloadable==true) ||
        data.type === "Influx" ||
        data.type === "GeoJSON"
      ) {
        var downloadBtn = createDownloadBtn(asset, data, dateDiv, index);
        dateContentDiv.appendChild(downloadBtn);
      }
    });

    if(asset.data.length > 1){
      var timeseriesDiv = createTimeseriesDiv(asset, assetCheckbox, checkboxes, uploads);
      datesPanelDiv.appendChild(timeseriesDiv);
    }

    dateDivs.map(div => {
      datesPanelDiv.appendChild(div);
    })

    var opacityBtn = createAssetOpacitySliderBtn(asset,assetDiv,assetDatasets);
    assetDiv.firstChild.appendChild(opacityBtn);
  }

  assetCheckbox.onchange = (e) => {
    handleAssetCheckboxChange(checkboxes, assetCheckbox, asset, uploads);
  };

  return assetDiv;
}