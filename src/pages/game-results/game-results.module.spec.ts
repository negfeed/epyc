import { GameResultsPageModule } from './game-results.module';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('GameResultsPageModule', () => {
  let gameResultsPageModule: GameResultsPageModule;

  beforeEach(() => {
    gameResultsPageModule = new GameResultsPageModule();
  });

  it('should create the game results page module instance', () => {
    expect(gameResultsPageModule).toBeTruthy();
  });

  // Example for testing NgModule metadata with TestBed (commented out per instructions)
  // describe('GameResultsPageModule with TestBed', () => {
  //   beforeEach(async () => {
  //     await TestBed.configureTestingModule({
  //       imports: [GameResultsPageModule],
  //       schemas: [NO_ERRORS_SCHEMA],
  //     }).compileComponents();
  //   });

  //   it('should be configured with TestBed', () => {
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });
});
