import { viewer, controllers } from "./State.js";

const createGraph = (
  x,
  y,
  traceNames,
  type,
  graphTitle,
  suffix,
  doubleAxis,
  divID
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

  var twoWeeksBefore = Cesium.JulianDate.toDate(viewer.clock.currentTime);
  twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);

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
        range: [
          twoWeeksBefore,
          Cesium.JulianDate.toDate(viewer.clock.currentTime),
        ],
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
        range: [
          twoWeeksBefore,
          Cesium.JulianDate.toDate(viewer.clock.currentTime),
        ],
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
  document.getElementById("graphs-container").appendChild(plotDiv);

  Plotly.react(plotDiv, data, layout);
};

export const loadGraph = (data) => {
  if (document.getElementById("graphs-modal").style.display === "none") return;
  viewer.selectedEntity = null;
  var station = data.station;

  // while (document.getElementById("graphs-container").firstChild) {
  //   document
  //     .getElementById("graphs-container")
  //     .removeChild(document.getElementById("graphs-container").firstChild);
  // }
  // document.getElementById("graphs-modal").style.display = "block";

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
      // cache: "no-store",
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
      if (parsedResponse.length === 0) return;

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
        "PAR_TSR"
      );

      var mean_Soil_VWC = [];
      var mean_Soil_VWC_names = [];
      var mean_Soil_Temp = [];
      var mean_Soil_Temp_names = [];
      var mean_Soil_EC = [];
      var mean_Soil_EC_names = [];

      Object.keys(parsedResponse[0]).map((key, index) => {
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
        "Soil_VWC"
      );

      createGraph(
        unpackData(parsedResponse, "time"),
        mean_Soil_Temp,
        mean_Soil_Temp_names,
        "scatter",
        "Soil Temperature Mean",
        "°C",
        false,
        "Soil_Temp"
      );

      createGraph(
        unpackData(parsedResponse, "time"),
        mean_Soil_EC,
        mean_Soil_EC_names,
        "scatter",
        "Soil Electrical Conductivity",
        "dS/m",
        false,
        "Soil_EC"
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
        "Air_Temp_Hum"
      );

      fetch(
        `/cesium/influx/daily?station=${station}&time=${Cesium.JulianDate.toDate(
          viewer.clock.currentTime
        ).getTime()}`,
        {
          cache: "no-store",
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
            "Rain"
          );

          createGraph(
            unpackData(parsedResponse, "time"),
            [unpackData(parsedResponse, "mean_Snow_Depth")],
            ["mean_Snow_Depth"],
            "scatter",
            "Snow Depth",
            "m",
            false,
            "Snow"
          );

          createGraph(
            unpackData(parsedResponse, "time"),
            [unpackData(parsedResponse, "mean_Battery_Voltage")],
            ["cr1000x.mean_Battery_Voltage"],
            "scatter",
            "Mean Battery Voltage",
            "V",
            false,
            "Bat_Volt"
          );
        });
    })
    .catch((error) => console.log(error));
};

export const closeGraphModal = () => {
  document.getElementById("graphs-modal").style.display = "none";
};
