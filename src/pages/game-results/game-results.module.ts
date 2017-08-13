import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { GameResultsPage } from './game-results';

@NgModule({
  declarations: [GameResultsPage],
  imports: [IonicPageModule.forChild(GameResultsPage)]
})
export class GameResultsPageModule {}