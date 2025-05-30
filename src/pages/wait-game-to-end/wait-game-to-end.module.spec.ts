import { WaitGameToEndPageModule } from './wait-game-to-end.module';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WaitGameToEndPageModule', () => {
  let waitGameToEndPageModule: WaitGameToEndPageModule;

  beforeEach(() => {
    waitGameToEndPageModule = new WaitGameToEndPageModule();
  });

  it('should create the wait game to end page module instance', () => {
    expect(waitGameToEndPageModule).toBeTruthy();
  });

  // Example for testing NgModule metadata with TestBed (commented out per instructions)
  // describe('WaitGameToEndPageModule with TestBed', () => {
  //   beforeEach(async () => {
  //     await TestBed.configureTestingModule({
  //       imports: [WaitGameToEndPageModule],
  //       schemas: [NO_ERRORS_SCHEMA],
  //     }).compileComponents();
  //   });

  //   it('should be configured with TestBed', () => {
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });
});
