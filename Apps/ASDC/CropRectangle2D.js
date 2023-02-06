import { viewer } from "./State.js";
import { cropBox2D } from "./CropBox2D.js";
import { cropBoxes } from "./State.js";

//used for drawing
export class cropRectangle2D {
  constructor(data) {
    this.positions = [];
    this.data = data;

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
        outlineColor: Cesium.Color.WHITE.withAlpha(1),
        outline: true,
        outlineWidth: 2,
      },
    });
    this.drawing = false;
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
        this.removeEventHandlers();

        var box = new cropBox2D(this.data, this.positions);

        if (!document.getElementById(`crop-checkbox-${this.data.id}`).checked)
          box.toggleVisibilityOff();

        box.updateBox();
        box.onChange({
          modelMatrix: box.modelMatrix,
          translationRotationScale: box.trs,
        });

        cropBoxes[this.data.id] = box;

        document.getElementById(`rectangle-btn-${this.data.id}`).style.color =
          null;
        document.getElementById(`draw-msg-${this.data.id}`).style.display =
          "none";
        this.destroy();
        delete this;
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

  destroy = () => {
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewer.entities.remove(this.polygon);
    viewer.scene.screenSpaceCameraController.enableInputs = true;

    this.drawing = false;
    this.drawingHeight = false;
  };
}
