import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { describe, beforeEach, it, expect } from '@jest/globals';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });

    // Add more tests based on your actual AppController methods
    // For example:
    // it('should call appService.someMethod()', () => {
    //   const someMethodSpy = jest.spyOn(appService, 'someMethod');
    //   appController.someControllerMethod();
    //   expect(someMethodSpy).toHaveBeenCalled();
    // });
  });
});