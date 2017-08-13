import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { DrawPage } from './draw';
import { ComponentsModule } from '../../components/components.module'

@NgModule({
  declarations: [DrawPage],
  imports: [IonicPageModule.forChild(DrawPage), ComponentsModule]
})
export class DrawPageModule {}