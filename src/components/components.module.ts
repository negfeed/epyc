import { NgModule } from '@angular/core';
import { IonicModule }  from 'ionic-angular'

import { ReplayingDrawingCanvas } from './replaying-drawing-canvas/replaying-drawing-canvas'
import { RecordingDrawingCanvas } from './recording-drawing-canvas/recording-drawing-canvas'
import { DrawingControlBarComponent } from './drawing-control-bar/drawing-control-bar';

@NgModule({
  declarations: [
    ReplayingDrawingCanvas,
     RecordingDrawingCanvas,
    DrawingControlBarComponent
  ],
  imports: [IonicModule],
  exports: [
    ReplayingDrawingCanvas, 
    RecordingDrawingCanvas,
    DrawingControlBarComponent
  ]
})
export class ComponentsModule { }
