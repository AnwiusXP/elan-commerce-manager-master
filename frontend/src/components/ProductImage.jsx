import React from 'react';

/**
 * Componente ProductImage
 * Maneja la carga de imágenes de productos con un fallback automático.
 * 
 * @param {Object} props
 * @param {number|string} props.id - ID del producto para el nombre del archivo.
 * @param {string} props.alt - Texto alternativo para la imagen.
 * @param {Object} props.style - Estilos adicionales para la etiqueta img.
 * @param {string} props.className - Clases CSS adicionales.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ProductImage = ({ id, alt, style = {}, className = "" }) => {
  const defaultImage = '/images/products/default-product.jpg';
  const productImage = `${API_URL}/static/images/products/${id}.jpg`;

  const handleError = (e) => {
    e.target.onerror = null; // Previene bucles infinitos
    e.target.src = defaultImage;
  };

  return (
    <img
      src={productImage}
      alt={alt}
      onError={handleError}
      className={className}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'cover',
        borderRadius: '12px', // Estilo Purity Clean
        ...style
      }}
    />
  );
};

export default ProductImage;
