import { WaitTurnPageModule } from './wait-turn.module';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WaitTurnPageModule', () => {
  let waitTurnPageModule: WaitTurnPageModule;

  beforeEach(() => {
    waitTurnPageModule = new WaitTurnPageModule();
  });

  it('should create the wait turn page module instance', () => {
    expect(waitTurnPageModule).toBeTruthy();
  });

  // Example for testing NgModule metadata with TestBed (commented out per instructions)
  // describe('WaitTurnPageModule with TestBed', () => {
  //   beforeEach(async () => {
  //     await TestBed.configureTestingModule({
  //       imports: [WaitTurnPageModule],
  //       schemas: [NO_ERRORS_SCHEMA],
  //     }).compileComponents();
  //   });

  //   it('should be configured with TestBed', () => {
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });
});
