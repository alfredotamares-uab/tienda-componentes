import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Producto } from '../../modelos/tienda';

const IMAGENES_PRODUCTO: Partial<Record<number, string>> = {
  1: 'rtx-4060.jpg',
  2: 'radeon-rx-7600.jpg',
  3: 'ryzen-5-5600.jpg',
  4: 'core-i5-12400f.jpg',
  5: 'kingston-fury-beast-ddr4-rgb.jpg',
  6: 'kingston-nv3.jpg',
  7: 'placa-b550.jpg',
  8: 'fuente-650w.jpg',
  9: 'samsung-990-evo-plus.jpg',
  10: 'corsair-cx650.jpg',
};

@Component({
  selector: 'app-producto-tarjeta',
  imports: [CurrencyPipe],
  templateUrl: './producto-tarjeta.html',
  styleUrl: './producto-tarjeta.css',
  host: { class: 'd-block h-100' },
})
export class ProductoTarjeta {
  readonly producto = input.required<Producto>();
  readonly agregar = output<number>();
  protected readonly imagen = computed(() => IMAGENES_PRODUCTO[this.producto().id]);
}
