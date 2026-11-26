import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('muestra los enlaces a las pantallas principales', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app: HTMLElement = fixture.nativeElement;
    const enlaces = [...app.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));
    expect(enlaces).toEqual(['/productos', '/nuevo-pedido', '/pedidos']);
  });
});
