import { cropBoxMap } from "./CropBoxMap.js";
import { viewer, setCropBoxMap } from "./State.js";

export class cropRectangleMap {
  constructor() {
    this.positions = [];

    this.polygon = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          if (this.positions[0] && this.positions[1]) {
            var frame = Cesium.Transforms.eastNorthUpToFixedFrame(
              Cesium.Cartographic.toCartesian(this.positions[0])
            );
            var xaxis = Cesium.Matrix4.getColumn(
              frame,
              0,
              new Cesium.Cartesian3()
            );
            var yaxis = Cesium.Matrix4.getColumn(
              frame,
              1,
              new Cesium.Cartesian3()
            );

            var dot = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[1]),
              xaxis,
              new Cesium.Cartesian3()
            );

            var dot2 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              xaxis,
              new Cesium.Cartesian3()
            );

            this.lenX = dot - dot2;

            var l1 = Cesium.Cartesian3.multiplyByScalar(
              xaxis,
              this.lenX,
              new Cesium.Cartesian3()
            );

            Cesium.Cartesian3.add(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              l1,
              l1
            );

            l1 = Cesium.Cartographic.fromCartesian(l1);

            var dot3 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[1]),
              yaxis,
              new Cesium.Cartesian3()
            );

            var dot4 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              yaxis,
              new Cesium.Cartesian3()
            );

            this.lenY = dot3 - dot4;

            var l2 = Cesium.Cartesian3.multiplyByScalar(
              yaxis,
              this.lenY,
              new Cesium.Cartesian3()
            );

            Cesium.Cartesian3.add(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              l2,
              l2
            );

            l2 = Cesium.Cartographic.fromCartesian(l2);

            return new Cesium.PolygonHierarchy(
              Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                this.positions[0],
                l1,
                this.positions[1],
                l2,
                this.positions[0],
              ])
            );
          } else {
            return new Cesium.PolygonHierarchy([]);
          }
        }, false),
        material: Cesium.Color.WHITE.withAlpha(0.1),
        closeTop: true,
        closeBottom: true,
        outlineColor: Cesium.Color.WHITE,
        outline: true,
        outlineWidth: 2,
      },
    });
    this.drawing = false;
    this.drawingHeight = false;
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.eventHandler.setInputAction(
      this.handleClick,
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
    this.eventHandler.setInputAction(
      this.handleMouseMove,
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    viewer.scene.canvas.style.cursor = "auto";
  }

  removeEventHandlers = () => {
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  };

  handleClick = (event) => {
    if (this.drawingHeight) {
      this.drawingHeight = false;
      this.eventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );
      this.eventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      );

      this.setClippingPlanesDirection();
    }
    if (this.positions.length < 2 || this.drawing) {
      const pickRay = viewer.scene.camera.getPickRay(event.position);
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      const cartoGlobePosition =
        Cesium.Cartographic.fromCartesian(globePosition);
      if (this.positions.length == 0) {
        this.drawing = true;
        this.polygon.polygon.height = cartoGlobePosition.height;
      }
      if (this.positions.length > 0) this.positions.pop();
      this.positions.push(Cesium.Cartographic.fromCartesian(globePosition));
      if (this.positions.length == 2) {
        this.drawing = false;
        this.drawingHeight = true;
      }
    }
  };

  handleMouseMove = (event) => {
    const pickRay = viewer.scene.camera.getPickRay(event.endPosition);
    if (this.drawing) {
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      if (this.positions.length == 2) this.positions.pop();
      this.positions.push(Cesium.Cartographic.fromCartesian(globePosition));
    }

    if (this.drawingHeight) {
      this.calcProperties();

      var minDot = 0;
      var minDotIndex;

      this.normals.slice(0, 4).map((n, i) => {
        var dot = Cesium.Cartesian3.dot(n, viewer.scene.camera.direction);
        if (dot < minDot) {
          minDot = dot;
          minDotIndex = i;
        }
      });

      var intersection = Cesium.IntersectionTests.rayPlane(
        pickRay,
        this.planes[minDotIndex]
      );
      if (intersection) {
        this.polygon.polygon.extrudedHeight =
          Cesium.Cartographic.fromCartesian(intersection).height;

        this.cPlanes = this.planes.map((plane, i) => {
          return new Cesium.ClippingPlane(plane.normal, plane.distance);
        });
      }
    }
  };

  calcProperties = () => {
    var frame = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartographic.toCartesian(this.positions[0])
    );
    var xaxis = Cesium.Matrix4.getColumn(frame, 0, new Cesium.Cartesian3());
    var yaxis = Cesium.Matrix4.getColumn(frame, 1, new Cesium.Cartesian3());

    var dot = Cesium.Cartesian3.dot(
      Cesium.Cartographic.toCartesian(this.positions[1]),
      xaxis,
      new Cesium.Cartesian3()
    );

    var dot2 = Cesium.Cartesian3.dot(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      xaxis,
      new Cesium.Cartesian3()
    );

    this.lenX = dot - dot2;

    var l1 = Cesium.Cartesian3.multiplyByScalar(
      xaxis,
      this.lenX,
      new Cesium.Cartesian3()
    );

    Cesium.Cartesian3.add(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      l1,
      l1
    );

    l1 = Cesium.Cartographic.fromCartesian(l1);

    var dot3 = Cesium.Cartesian3.dot(
      Cesium.Cartographic.toCartesian(this.positions[1]),
      yaxis,
      new Cesium.Cartesian3()
    );

    var dot4 = Cesium.Cartesian3.dot(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      yaxis,
      new Cesium.Cartesian3()
    );

    this.lenY = dot3 - dot4;

    var l2 = Cesium.Cartesian3.multiplyByScalar(
      yaxis,
      this.lenY,
      new Cesium.Cartesian3()
    );

    Cesium.Cartesian3.add(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      l2,
      l2
    );

    l2 = Cesium.Cartographic.fromCartesian(l2);

    var p1 = Cesium.Cartographic.toCartesian(this.positions[0]);
    var p2 = Cesium.Cartographic.toCartesian(l2);
    var p3 = Cesium.Cartographic.toCartesian(l1);
    var p4 = Cesium.Cartographic.toCartesian(this.positions[1]);

    this.points = [p1, p2, p3, p4];

    var n1 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //south
    var n2 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p1, p2, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //north-pointing
    var n3 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p1, p3, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //west
    var n4 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p3, p1, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //east

    this.normals = [n1, n2, n3, n4];

    var normals = this.normals;

    var plane1 = new Cesium.Plane.fromPointNormal(p1, normals[0]);
    var plane2 = new Cesium.Plane.fromPointNormal(p2, normals[1]);
    var plane3 = new Cesium.Plane.fromPointNormal(p3, normals[2]);
    var plane4 = new Cesium.Plane.fromPointNormal(p1, normals[3]);

    this.planes = [plane1, plane2, plane3, plane4];
  };

  setClippingPlanesDirection = () => {
    this.destroy();

    var topPoint = Cesium.Cartesian3.clone(
      Cesium.Cartographic.toCartesian(this.positions[1]),
      new Cesium.Cartesian3()
    );
    topPoint = Cesium.Cartographic.fromCartesian(topPoint);
    topPoint.height = this.polygon.polygon.extrudedHeight.getValue();

    var translation = Cesium.Cartesian3.midpoint(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      Cesium.Cartographic.toCartesian(topPoint),
      new Cesium.Cartesian3()
    );

    var scale = new Cesium.Cartesian3(
      Math.abs(this.lenX),
      Math.abs(this.lenY),
      Math.abs(
        this.polygon.polygon.extrudedHeight.getValue() -
          this.polygon.polygon.height.getValue()
      )
    );

    var box = new cropBoxMap(translation, scale);

    box.updateBox();
    box.onChange({
      modelMatrix: box.modelMatrix,
      translationRotationScale: box.trs,
    });

    setCropBoxMap(box);

    document.getElementById("clip-draw-button").style.background = null;
    delete this;
  };

  destroy = () => {
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewer.entities.remove(this.polygon);
    viewer.scene.screenSpaceCameraController.enableInputs = true;

    this.drawing = false;
    this.drawingHeight = false;
  };
}
