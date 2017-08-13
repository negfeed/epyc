import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { GuessPage } from './guess';
import { ComponentsModule } from '../../components/components.module'

@NgModule({
  declarations: [GuessPage],
  imports: [IonicPageModule.forChild(GuessPage), ComponentsModule]
})
export class GuessPageModule {}