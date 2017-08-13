import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { ThreadResultsPage } from './thread-results';
import { ComponentsModule } from '../../components/components.module'

@NgModule({
  declarations: [ThreadResultsPage],
  imports: [IonicPageModule.forChild(ThreadResultsPage), ComponentsModule]
})
export class ThreadResultsPageModule {}