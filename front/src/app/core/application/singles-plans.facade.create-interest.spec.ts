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

  const nextTick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  it('envía el interés a la API y lo añade a la lista', async () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    const request = facade.createInterest('Senderismo');

    const post = httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/admin/interests');
    expect(post.request.body).toEqual({ name: 'Senderismo' });
    post.flush({ _id: '1', name: 'Senderismo' });
    await nextTick();

    const get = httpMock.expectOne((req) => req.method === 'GET' && req.url === '/api/admin/interests');
    get.flush([{ _id: '1', name: 'Senderismo' }]);

    await request;
    expect(facade.availableGroupInterests().map((item) => item.name)).toEqual(['Senderismo']);
    expect(facade.notice()).toContain('Senderismo');
  });

  it('avisa si la API no confirma que el interés quedó guardado', async () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    const request = facade.createInterest('Senderismo');

    httpMock
      .expectOne((req) => req.method === 'POST' && req.url === '/api/admin/interests')
      .flush({ _id: '1', name: 'Senderismo' });
    await nextTick();
    httpMock
      .expectOne((req) => req.method === 'GET' && req.url === '/api/admin/interests')
      .flush([]);

    await request;
    expect(facade.availableGroupInterests()).toEqual([]);
    expect(facade.notice()).toBe('');
    expect(facade.error()).toContain('no se ha guardado');
  });
});
