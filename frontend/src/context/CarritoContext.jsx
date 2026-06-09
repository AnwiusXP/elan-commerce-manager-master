/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer } from 'react';

const CarritoContext = createContext();

const inicializarEstado = () => {
  try {
    const local = localStorage.getItem('carrito');
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

const carritoReducer = (estado, accion) => {
  let nuevoEstado;
  switch (accion.type) {
    case 'AGREGAR': {
      const existe = estado.find(it => it.id === accion.payload.id);
      if (existe) {
        if (existe.cantidad >= accion.payload.stock) {
          alert(`❌ No puedes agregar más. El stock máximo es de ${accion.payload.stock} unidades.`);
          return estado;
        }
        nuevoEstado = estado.map(it => 
          it.id === accion.payload.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      } else {
        if (accion.payload.stock < 1) {
          alert(`❌ Producto sin stock disponible.`);
          return estado;
        }
        nuevoEstado = [...estado, { ...accion.payload, cantidad: 1 }];
      }
      break;
    }
    case 'ELIMINAR': {
      nuevoEstado = estado.filter((_, idx) => idx !== accion.payload);
      break;
    }
    case 'VACIAR': {
      nuevoEstado = [];
      break;
    }
    default:
      return estado;
  }
  
  localStorage.setItem('carrito', JSON.stringify(nuevoEstado));
  return nuevoEstado;
};

export const CarritoProvider = ({ children }) => {
  const [carrito, dispatch] = useReducer(carritoReducer, [], inicializarEstado);
  const [drawerAbierto, setDrawerAbierto] = React.useState(false);

  // Calcular totales
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const agregarAlCarrito = (producto) => {
    dispatch({ type: 'AGREGAR', payload: { ...producto, producto_id: producto.id } });
    setDrawerAbierto(true);
  };

  const eliminarDelCarrito = (index) => {
    dispatch({ type: 'ELIMINAR', payload: index });
  };

  const vaciarCarrito = () => {
    dispatch({ type: 'VACIAR' });
  };

  const abrirDrawer = () => setDrawerAbierto(true);
  const cerrarDrawer = () => setDrawerAbierto(false);

  return (
    <CarritoContext.Provider value={{
      carrito,
      totalItems,
      totalPrecio,
      agregarAlCarrito,
      eliminarDelCarrito,
      vaciarCarrito,
      drawerAbierto,
      abrirDrawer,
      cerrarDrawer
    }}>
      {children}
    </CarritoContext.Provider>
  );
};

export const useCarrito = () => useContext(CarritoContext);
