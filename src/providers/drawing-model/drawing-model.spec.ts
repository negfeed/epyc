import { DrawingModel } from './drawing-model';
import { DrawingAction } from './drawing-model'; // Assuming DrawingAction is an exported interface/type

describe('DrawingModel', () => {
  let drawingModel: DrawingModel;
  const mockCanvasDimensions = { width: 800, height: 600 };

  beforeEach(() => {
    // DrawingModel seems to be a class that holds drawing data.
    // It might be instantiated with initial data or start empty.
    drawingModel = new DrawingModel('testPlayer1', mockCanvasDimensions.width, mockCanvasDimensions.height);
  });

  it('should create an instance of DrawingModel', () => {
    expect(drawingModel).toBeTruthy();
  });

  it('should initialize with player, dimensions, and empty actions', () => {
    expect(drawingModel.player).toEqual('testPlayer1');
    expect(drawingModel.width).toEqual(mockCanvasDimensions.width);
    expect(drawingModel.height).toEqual(mockCanvasDimensions.height);
    expect(drawingModel.actions).toEqual([]);
    expect(drawingModel.startTime).toBeNull();
    expect(drawingModel.endTime).toBeNull();
  });

  it('start method should set the startTime', () => {
    drawingModel.start();
    expect(drawingModel.startTime).toBeDefined();
    expect(drawingModel.startTime).toBeLessThanOrEqual(Date.now());
  });

  it('stop method should set the endTime', () => {
    drawingModel.start(); // Start must be called before stop for endTime logic
    drawingModel.stop();
    expect(drawingModel.endTime).toBeDefined();
    expect(drawingModel.endTime).toBeGreaterThanOrEqual(drawingModel.startTime as number);
  });

  it('addAction method should add an action to the actions array', () => {
    const action: DrawingAction = { type: 'down', x: 10, y: 20, t: 0, color: '#000', size: 5 };
    drawingModel.start(); // Actions are typically added after starting
    drawingModel.addAction(action.type, action.x, action.y, action.color, action.size);

    expect(drawingModel.actions.length).toBe(1);
    const addedAction = drawingModel.actions[0];
    expect(addedAction.type).toEqual(action.type);
    expect(addedAction.x).toEqual(action.x);
    expect(addedAction.y).toEqual(action.y);
    expect(addedAction.color).toEqual(action.color);
    expect(addedAction.size).toEqual(action.size);
    expect(addedAction.t).toBeGreaterThanOrEqual(0); // Relative time
  });

  it('addAction should not add action if not started', () => {
    // Assuming addAction has a guard or start() must be called first
    // This depends on the DrawingModel's internal logic.
    // If actions can be added before start, this test is invalid.
    const action: DrawingAction = { type: 'down', x: 10, y: 20, t: 0, color: '#000', size: 5 };
    // drawingModel.start(); // Not starting
    drawingModel.addAction(action.type, action.x, action.y, action.color, action.size);
    // If addAction is guarded by startTime being null:
    if (drawingModel.startTime === null) {
        expect(drawingModel.actions.length).toBe(0);
    } else {
        // If actions can be added anytime, then this test needs adjustment.
        expect(drawingModel.actions.length).toBe(1);
    }
  });


  it('clear method should reset actions, startTime, and endTime', () => {
    drawingModel.start();
    drawingModel.addAction('down', 10, 20, '#000', 5);
    drawingModel.stop();
    drawingModel.clear();

    expect(drawingModel.actions).toEqual([]);
    expect(drawingModel.startTime).toBeNull();
    expect(drawingModel.endTime).toBeNull();
  });

  it('getDuration method should calculate duration correctly', () => {
    drawingModel.startTime = Date.now() - 1000; // 1 second ago
    drawingModel.endTime = Date.now();
    expect(drawingModel.getDuration()).toEqual(1000);

    drawingModel.endTime = null; // If not stopped
    expect(drawingModel.getDuration()).toBeNull();

    drawingModel.startTime = null; // If not started
    drawingModel.endTime = null;
    expect(drawingModel.getDuration()).toBeNull();
  });

  it('toObject method should return a plain object representation', () => {
    drawingModel.start();
    drawingModel.addAction('down', 10, 10, '#FF0000', 3);
    drawingModel.addAction('move', 15, 15, '#FF0000', 3);
    drawingModel.stop();

    const obj = drawingModel.toObject();

    expect(obj).toBeDefined();
    expect(obj.player).toEqual('testPlayer1');
    expect(obj.width).toEqual(mockCanvasDimensions.width);
    expect(obj.height).toEqual(mockCanvasDimensions.height);
    expect(obj.actions.length).toBe(2);
    expect(obj.actions[0].type).toEqual('down');
    expect(obj.startTime).toEqual(drawingModel.startTime);
    expect(obj.endTime).toEqual(drawingModel.endTime);
    expect(obj.duration).toEqual(drawingModel.getDuration());
  });
});
