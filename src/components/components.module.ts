import { NgModule } from '@angular/core';
import { IonicModule }  from 'ionic-angular'

import { ReplayingDrawingCanvas } from './replaying-drawing-canvas/replaying-drawing-canvas'
import { RecordingDrawingCanvas } from './recording-drawing-canvas/recording-drawing-canvas'

@NgModule({
  declarations: [ReplayingDrawingCanvas, RecordingDrawingCanvas],
  imports: [IonicModule],
  exports: [ReplayingDrawingCanvas, RecordingDrawingCanvas]
})
export class ComponentsModule { }
