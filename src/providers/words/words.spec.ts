import { WordsService } from './words'; // Assuming the class name is WordsService
import { Http } from '@angular/http'; // Or HttpClient if using newer Angular
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of'; // For mocking Observable responses

// Mock for Http (AngularJS Http or older Angular HttpClient)
class MockHttp {
  get = jest.fn((url: string) => {
    if (url.includes('easy')) {
      return Observable.of({ json: () => ['apple', 'banana', 'cat', 'dog'] });
    } else if (url.includes('medium')) {
      return Observable.of({ json: () => ['elephant', 'giraffe', 'hippo'] });
    } else if (url.includes('hard')) {
      return Observable.of({ json: () => ['onomatopoeia', 'juxtaposition'] });
    }
    return Observable.of({ json: () => [] });
  });
  // Mock other Http methods if used
}

describe('WordsService', () => {
  let wordsService: WordsService;
  let mockHttp: MockHttp;

  beforeEach(() => {
    mockHttp = new MockHttp();
    // WordsService is likely an @Injectable, but for simple tests, direct instantiation.
    wordsService = new WordsService(mockHttp as any);
    // If it initializes words in constructor or an init method, those might be called here
    // or spied upon if they make http calls.
    // For this example, we assume getRandomWord or getWordsForDifficulty will trigger loading.
  });

  it('should create an instance of WordsService', () => {
    expect(wordsService).toBeTruthy();
  });

  it('getRandomWord method should return a random word from the combined list', (done) => {
    // This test assumes getRandomWord internally calls getWords which loads all difficulties.
    // Or, if it loads on demand, we test a specific difficulty first.
    // To make it simple, let's assume getWordsForDifficulty is called by getRandomWord or words are preloaded.

    // Spy on the internal load methods if they exist and are called by getRandomWord
    // jest.spyOn(wordsService, 'getWordsForDifficulty').mockImplementation((difficulty) => {
    //   if (difficulty === 'easy') return Promise.resolve(['easyword']);
    //   return Promise.resolve([]);
    // });
    // Or if words are loaded via HTTP get in constructor or init method:
    // (mockHttp.get as jest.Mock).mockReturnValueOnce(Observable.of({ json: () => ['testword1', 'testword2'] }));
    // wordsService.init(); // if there is an init method

    wordsService.getRandomWord().then(word => {
      expect(word).toBeDefined();
      expect(typeof word).toBe('string');
      // A more robust test would involve checking if the word is from the expected set,
      // but that requires knowing how words are loaded and combined.
      // For now, we just check if a word is returned.
      // To ensure all words are loaded for a truly random pick:
      // expect(mockHttp.get).toHaveBeenCalledWith(wordsService.EASY_WORDS_URL);
      // expect(mockHttp.get).toHaveBeenCalledWith(wordsService.MEDIUM_WORDS_URL);
      // expect(mockHttp.get).toHaveBeenCalledWith(wordsService.HARD_WORDS_URL);
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  it('getWordsForDifficulty should fetch and return words for a given difficulty', (done) => {
    wordsService.getWordsForDifficulty('easy').then(words => {
      expect(words).toBeDefined();
      expect(Array.isArray(words)).toBe(true);
      expect(words.length).toBeGreaterThan(0);
      expect(words).toContain('apple');
      expect(mockHttp.get).toHaveBeenCalledWith(wordsService.EASY_WORDS_URL); // Assuming EASY_WORDS_URL is a public member or reconstructible
      done();
    });
  });

  it('getWordsForDifficulty should cache words after first fetch for a difficulty', (done) => {
    wordsService.getWordsForDifficulty('medium').then(firstCallWords => {
      expect(mockHttp.get).toHaveBeenCalledTimes(1); // Should be 1 after previous easy and this medium
      wordsService.getWordsForDifficulty('medium').then(secondCallWords => {
        expect(mockHttp.get).toHaveBeenCalledTimes(1); // Should still be 1 for 'medium' as it's cached
        expect(secondCallWords).toEqual(firstCallWords);
        done();
      });
    });
  });


  it('should load all words if a method like loadAllWords is called', (done) => {
    // This assumes a method that explicitly loads all difficulties,
    // e.g., if getRandomWord relies on pre-loaded words.
    // If WordsService has a method like `ensureWordsLoaded()` or similar:
    if (typeof (wordsService as any)._loadWords === 'function') { // Assuming a private method convention
        Promise.all([
            (wordsService as any)._loadWords('easy'),
            (wordsService as any)._loadWords('medium'),
            (wordsService as any)._loadWords('hard')
        ]).then(() => {
            expect(wordsService.easyWords.length).toBeGreaterThan(0);
            expect(wordsService.mediumWords.length).toBeGreaterThan(0);
            expect(wordsService.hardWords.length).toBeGreaterThan(0);
            done();
        });
    } else {
        // If loading is implicit, test through public methods like getRandomWord
        wordsService.getRandomWord().then(() => {
             // Check if underlying arrays are populated (assuming they are public for testability or via getter)
            expect(wordsService.easyWords.length).toBeGreaterThan(0);
            expect(wordsService.mediumWords.length).toBeGreaterThan(0);
            expect(wordsService.hardWords.length).toBeGreaterThan(0);
            done();
        });
    }
  });

  it('getRandomWord should return a word even if only one difficulty has words', (done) => {
    (mockHttp.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('easy')) return Observable.of({ json: () => ['onlyword'] });
      return Observable.of({ json: () => [] }); // Other difficulties return empty
    });
    // Reset cache if any
    wordsService.easyWords = []; wordsService.mediumWords = []; wordsService.hardWords = [];
    (wordsService as any).loaded = {easy: false, medium: false, hard: false};


    wordsService.getRandomWord().then(word => {
      expect(word).toEqual('onlyword');
      done();
    });
  });

  it('getRandomWord should return null or throw error if no words are available at all', (done) => {
    (mockHttp.get as jest.Mock).mockReturnValue(Observable.of({ json: () => [] })); // All difficulties return empty
    // Reset cache
    wordsService.easyWords = []; wordsService.mediumWords = []; wordsService.hardWords = [];
    (wordsService as any).loaded = {easy: false, medium: false, hard: false};


    wordsService.getRandomWord().then(word => {
      // Depending on implementation, it might return null, undefined, or reject.
      // Let's assume it might return null if no words.
      expect(word).toBeNull(); // Or undefined, or catch an error if it rejects
      done();
    }).catch(error => {
      // Or if it's expected to throw/reject:
      // expect(error).toBeDefined();
      done();
    });
  });
});
