import { HomePageModule } from './home.module';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('HomePageModule', () => {
  let homePageModule: HomePageModule;

  beforeEach(() => {
    homePageModule = new HomePageModule();
  });

  it('should create the home page module instance', () => {
    expect(homePageModule).toBeTruthy();
  });

  // Example for testing NgModule metadata with TestBed (commented out per instructions)
  // describe('HomePageModule with TestBed', () => {
  //   beforeEach(async () => {
  //     await TestBed.configureTestingModule({
  //       imports: [HomePageModule],
  //       schemas: [NO_ERRORS_SCHEMA],
  //     }).compileComponents();
  //   });

  //   it('should be configured with TestBed', () => {
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });
});
