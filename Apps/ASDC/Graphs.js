import {
  viewer,
  controllers,
  selectedDatasets,
  setSelectedDatasets,
} from "./State.js";

const createGraph = (
  x,
  y,
  traceNames,
  type,
  graphTitle,
  suffix,
  doubleAxis,
  divID,
  range
) => {
  const pallete = [
    "#7EB26D",
    "#EAB839",
    "#6ED0E0",
    "#EF843C",
    "#E24D42",
    "#1F78C1",
  ];

  var data = [];

  y.map((yi, i) => {
    if (type === "scatter") {
      data.push({
        type: type,
        mode: "lines",
        name: traceNames[i],
        x: x,
        y: yi,
        line: { color: pallete[i], width: 1 },
      });
    } else if (type === "bar") {
      data.push({
        type: type,
        name: traceNames[i],
        x: x,
        y: yi,
        marker: { color: pallete[i] },
      });
    }
  });

  if (!range){
    var twoWeeksBefore = Cesium.JulianDate.toDate(viewer.clock.currentTime);
    twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
    var range = [
      twoWeeksBefore,
      Cesium.JulianDate.toDate(viewer.clock.currentTime),
    ];
  }
  

  if (doubleAxis) {
    data[data.length - 1].yaxis = "y2";
    var layout = {
      title: graphTitle,
      plot_bgcolor: "black",
      paper_bgcolor: "black",
      font: {
        size: 10,
        color: "white",
      },
      yaxis: {
        gridcolor: "rgba(255,255,255,0.25)",
        ticksuffix: suffix[0],
      },
      yaxis2: {
        gridcolor: "rgba(255,255,255,0.25)",
        overlaying: "y",
        side: "right",
        ticksuffix: suffix[1],
      },
      xaxis: {
        gridcolor: "rgba(255,255,255,0.25)",
        range: range
      },
      legend: {
        xanchor: "center",
        yanchor: "top",
        y: -0.3,
        x: 0.5,
      },
      hoverlabel: {
        namelength: -1,
      },
    };
  } else {
    var layout = {
      title: graphTitle,
      plot_bgcolor: "black",
      paper_bgcolor: "black",
      font: {
        size: 10,
        color: "white",
      },
      yaxis: {
        gridcolor: "rgba(255,255,255,0.25)",
        ticksuffix: suffix,
      },
      xaxis: {
        gridcolor: "rgba(255,255,255,0.25)",
        range: range
      },
      legend: {
        xanchor: "center",
        yanchor: "top",
        y: -2,
        x: 0.5,
        orientation: "h",
      },
      hoverlabel: {
        namelength: -1,
      },
    };
  }

  var plotDiv = document.getElementById(divID);
  if (plotDiv){
    Plotly.react(plotDiv, data, layout, {responsive: true});
  }
};

export const loadInfluxGraphs = (data) => {
  if (document.getElementById("graphs-modal").style.display === "none") return;
  viewer.selectedEntity = null;
  var station = data.station;

  var graphs = ["PAR_TSR", "Soil_VWC","Soil_Temp","Soil_EC", "Air_Temp_Hum","Rain","Snow","Bat_Volt"];
  var container = document.getElementById("graphs-container");
  
  graphs.map(g=>{
    var graphDiv = document.getElementById(`graph_${data.id}_${g}`);
    if(!graphDiv){
      var graphDiv = document.createElement("div");
      graphDiv.className = "graph";
      graphDiv.id = `graph_${data.id}_${g}`;
      container.appendChild(graphDiv);
    }
  })

  if (!controllers[data.id]) {
    controllers[data.id] = new AbortController();
  } else {
    controllers[data.id].abort();
    controllers[data.id] = new AbortController();
  }

  fetch(
    `/cesium/influx/fivemin?station=${station}&time=${Cesium.JulianDate.toDate(
      viewer.clock.currentTime
    ).getTime()}`,
    {
      cache: "no-store",
      signal: controllers[data.id].signal,
    }
  )
    .then((response) => {
      if (response.status !== 200) {
        // console.log(response);
      }
      return response;
    })
    .then((response) => response.json())
    .then((parsedResponse) => {
      const unpackData = (arr, key) => {
        return arr.map((obj) => obj[key]);
      };  

      createGraph(
        unpackData(parsedResponse, "time"),
        [
          unpackData(parsedResponse, "mean_PAR"),
          unpackData(parsedResponse, "mean_TSR"),
        ],
        ["mean_PAR", "mean_Total_Solar_Radiation"],
        "scatter",
        "Photosynthetically Active Radiation & Shortwave Radiation",
        ["μmol/m²/s", "W/m²"],
        true,
        `graph_${data.id}_PAR_TSR`
      );

      var mean_Soil_VWC = [];
      var mean_Soil_VWC_names = [];
      var mean_Soil_Temp = [];
      var mean_Soil_Temp_names = [];
      var mean_Soil_EC = [];
      var mean_Soil_EC_names = [];

      parsedResponse.length>0 && Object.keys(parsedResponse[0]).map((key, index) => {
        if (key.startsWith("mean_Soil_VWC")) {
          mean_Soil_VWC.push(unpackData(parsedResponse, key));
          mean_Soil_VWC_names.push(key);
        }
        if (key.startsWith("mean_Soil_Temp")) {
          mean_Soil_Temp.push(unpackData(parsedResponse, key));
          mean_Soil_Temp_names.push(key);
        }
        if (key.startsWith("mean_Soil_EC")) {
          mean_Soil_EC.push(unpackData(parsedResponse, key));
          mean_Soil_EC_names.push(key);
        }
      });

      createGraph(
        unpackData(parsedResponse, "time"),
        mean_Soil_VWC,
        mean_Soil_VWC_names,
        "scatter",
        "Soil Volumetric Water Content",
        "%",
        false,
        `graph_${data.id}_Soil_VWC`
      );

      createGraph(
        unpackData(parsedResponse, "time"),
        mean_Soil_Temp,
        mean_Soil_Temp_names,
        "scatter",
        "Soil Temperature Mean",
        "°C",
        false,
        `graph_${data.id}_Soil_Temp`
      );

      createGraph(
        unpackData(parsedResponse, "time"),
        mean_Soil_EC,
        mean_Soil_EC_names,
        "scatter",
        "Soil Electrical Conductivity",
        "dS/m",
        false,
        `graph_${data.id}_Soil_EC`
      );

      createGraph(
        unpackData(parsedResponse, "time"),
        [
          unpackData(parsedResponse, "mean_Air_Temperature"),
          unpackData(parsedResponse, "mean_Relative_Humidity"),
        ],
        ["mean_Air_Temperature", "mean_Relative_Humidity"],
        "scatter",
        "Air Temperature & Relative Humidity",
        ["°C", "%H"],
        true,
        `graph_${data.id}_Air_Temp_Hum`
      );

      if (!controllers[data.id + "_daily"]) {
        controllers[data.id + "_daily"] = new AbortController();
      } else {
        controllers[data.id + "_daily"].abort();
        controllers[data.id + "_daily"] = new AbortController();
      }

      fetch(
        `/cesium/influx/daily?station=${station}&time=${Cesium.JulianDate.toDate(
          viewer.clock.currentTime
        ).getTime()}`,
        {
          cache: "no-store",
          signal: controllers[data.id + "_daily"].signal,
        }
      )
        .then((dailyresponse) => {
          if (dailyresponse.status !== 200) {
            // console.log(dailyresponse);
          }
          return dailyresponse;
        })
        .then((dailyresponse) => dailyresponse.json())
        .then((parsedDailyresponse) => {
          createGraph(
            unpackData(parsedDailyresponse, "time"),
            [unpackData(parsedDailyresponse, "sum_Rain")],
            ["sum_Rain"],
            "bar",
            "Daily Rainfall Total",
            "mm",
            false,
            `graph_${data.id}_Rain`
          );

          createGraph(
            unpackData(parsedResponse, "time"),
            [unpackData(parsedResponse, "mean_Snow_Depth")],
            ["mean_Snow_Depth"],
            "scatter",
            "Snow Depth",
            "m",
            false,
            `graph_${data.id}_Snow`
          );

          createGraph(
            unpackData(parsedResponse, "time"),
            [unpackData(parsedResponse, "mean_Battery_Voltage")],
            ["cr1000x.mean_Battery_Voltage"],
            "scatter",
            "Mean Battery Voltage",
            "V",
            false,
            `graph_${data.id}_Bat_Volt`
          );
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.log(error);
          }
        });
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        console.log(error);
      }
    });
};

export const loadCSVGraphs = (data)=> {
  var container = document.getElementById("graphs-container");
  
  data.graphs.map((graph,graphIndex)=>{
    var graphDivID = `graph_${data.id}_${graphIndex}`;
    var graphDiv = document.getElementById(graphDivID);
    if(graphDiv && graph.range){
      return
    }
    if(!graphDiv){
      var newGraphDiv = document.createElement("div");
      newGraphDiv.className = "graph";
      newGraphDiv.id = `graph_${data.id}_${graphIndex}`;
      container.appendChild(newGraphDiv);

      if (graphIndex==0){
        newGraphDiv.scrollIntoView({behavior: "smooth"});
      }
    }
  })
  

  fetch(
    data.url,
    { cache: "no-store" }
  ).then((response) => {
    return response;
  })
  .then((response) => response.text())
  .then((response) => {
    var csvRows = response.split('\r\n');
    var csvColumns = [];
    for (var i=1;i<csvRows.length;i++){
      var row = csvRows[i].split(',');
      row.map((column,colIndex)=>{
        if (!csvColumns[colIndex]){
          csvColumns[colIndex]=[];
        }
        csvColumns[colIndex].push(column);
      })
    }

    data.graphs.map((graph,graphIndex)=>{
      var xIndex = csvRows[0].split(',').indexOf(graph.columns.x);
      var x = csvColumns[xIndex];

      var y = [];
      if (Array.isArray(graph.columns.y)){
        graph.columns.y.map(yaxis=>{
          var yIndex = csvRows[0].split(',').indexOf(yaxis);
          y.push(csvColumns[yIndex]);
        })
      } else {
        var yIndex = csvRows[0].split(',').indexOf(graph.columns.y);
        y.push(csvColumns[yIndex]);
      }
      
      var graphDivID = `graph_${data.id}_${graphIndex}`;

      createGraph (
        x,
        y,
        Array.isArray(graph.traceNames) ? graph.traceNames : [graph.traceNames || ""],
        graph.type || "scatter",
        graph.title|| "",
        graph.unit || "",
        false,
        graphDivID,
        graph.range
        // data.endDateTime ? [new Date(new Date(data.endDateTime).getTime() - 2 * 7 * 86400000), new Date(data.endDateTime)] : undefined
      )
    })
  })
}

export const closeGraphModal = () => {
  document.getElementById("graphs-modal").style.display = "none";

  var oldSelectedDatasets = [...selectedDatasets];
  setSelectedDatasets(
    selectedDatasets.filter((data) => {
      return data.type !== "Influx" || data.type !== "CSV";
    })
  );
  oldSelectedDatasets.map((data) => {
    if (data.type === "Influx") {
      var checkbox = document.getElementById(`dataCheckbox-${data.id}`);
      if (checkbox) {
        checkbox.checked = false;
        checkbox.onchange();
      }
    }
  });
};
