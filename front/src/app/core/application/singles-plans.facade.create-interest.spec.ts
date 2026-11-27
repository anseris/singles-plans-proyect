import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { SinglesPlansFacade } from './singles-plans.facade';
import { authInterceptor } from '../auth/auth.interceptor';

describe('SinglesPlansFacade createInterest', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía el interés a la API y lo añade a la lista', async () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    const request = facade.createInterest('Senderismo');

    const req = httpMock.expectOne('/api/admin/interests');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Senderismo' });
    req.flush({ _id: '1', name: 'Senderismo' });

    await request;
    expect(facade.availableGroupInterests().map((item) => item.name)).toEqual(['Senderismo']);
    expect(facade.notice()).toContain('Senderismo');
  });
});
