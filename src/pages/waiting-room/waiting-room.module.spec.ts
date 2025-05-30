import { WaitingRoomPageModule } from './waiting-room.module';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WaitingRoomPageModule', () => {
  let waitingRoomPageModule: WaitingRoomPageModule;

  beforeEach(() => {
    waitingRoomPageModule = new WaitingRoomPageModule();
  });

  it('should create the waiting room page module instance', () => {
    expect(waitingRoomPageModule).toBeTruthy();
  });

  // Example for testing NgModule metadata with TestBed (commented out per instructions)
  // describe('WaitingRoomPageModule with TestBed', () => {
  //   beforeEach(async () => {
  //     await TestBed.configureTestingModule({
  //       imports: [WaitingRoomPageModule],
  //       schemas: [NO_ERRORS_SCHEMA],
  //     }).compileComponents();
  //   });

  //   it('should be configured with TestBed', () => {
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });
});
