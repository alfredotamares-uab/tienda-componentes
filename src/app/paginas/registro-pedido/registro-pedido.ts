import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Producto, SeleccionProducto } from '../../modelos/tienda';
import { ReglaPedidoError, TiendaService } from '../../servicios/tienda.service';

@Component({
  selector: 'app-registro-pedido',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './registro-pedido.html',
})
export class RegistroPedido implements OnInit {
  private readonly servicio = inject(TiendaService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorFormulario = signal('');
  protected readonly lineas = new FormArray([this.crearLinea()]);
  protected readonly formulario = new FormGroup({
    cliente: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
    }),
    lineas: this.lineas,
  });

  private readonly valores = toSignal(this.lineas.valueChanges, {
    initialValue: this.lineas.value,
  });
  private readonly productosPorId = computed(
    () => new Map(this.productos().map((producto) => [producto.id, producto])),
  );
  protected readonly existenciasPorLinea = computed(() => {
    const productos = this.productosPorId();
    return this.valores().map(({ productoId }) => productos.get(productoId ?? 0)?.existencias);
  });
  protected readonly total = computed(() => {
    const productos = this.productosPorId();
    const centavos = this.valores().reduce((total, linea) => {
      const precio = productos.get(linea.productoId ?? 0)?.precio ?? 0;
      const cantidad = linea.cantidad ?? 0;
      return Number.isSafeInteger(cantidad) && cantidad > 0
        ? total + Math.round(precio * 100) * cantidad
        : total;
    }, 0);
    return centavos / 100;
  });

  async ngOnInit(): Promise<void> {
    try {
      const productos = await this.servicio.listarProductos();
      this.productos.set(productos);

      const id = Number(this.ruta.snapshot.queryParamMap.get('producto'));
      if (productos.some((producto) => producto.id === id && producto.existencias > 0)) {
        this.lineas.at(0).controls.productoId.setValue(id);
      }
    } catch {
      this.errorCarga.set('No se pudieron cargar los productos del pedido.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected agregarLinea(): void {
    this.lineas.push(this.crearLinea());
  }

  protected quitarLinea(indice: number): void {
    this.lineas.removeAt(indice);
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.errorFormulario.set('');
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.errorFormulario.set('Revisa los campos marcados antes de registrar el pedido.');
      return;
    }

    const { cliente, lineas } = this.formulario.getRawValue();
    const seleccion: SeleccionProducto[] = [];
    for (const { productoId, cantidad } of lineas) {
      if (productoId === null || cantidad === null) return;
      seleccion.push({ productoId, cantidad });
    }

    this.guardando.set(true);
    try {
      const id = await this.servicio.registrarPedido(cliente, seleccion);
      await this.router.navigate(['/pedidos', id]);
    } catch (error) {
      this.errorFormulario.set(
        error instanceof ReglaPedidoError ? error.message : 'No se pudo registrar el pedido.',
      );
      if (error instanceof ReglaPedidoError) {
        const productos = await this.servicio.listarProductos().catch(() => this.productos());
        this.productos.set(productos);
      }
    } finally {
      this.guardando.set(false);
    }
  }

  private crearLinea() {
    return new FormGroup({
      productoId: new FormControl<number | null>(null, Validators.required),
      cantidad: new FormControl<number | null>(1, [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^[0-9]+$/),
      ]),
    });
  }
}
