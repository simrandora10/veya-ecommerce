import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useNotification } from '../components/Notification';

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [rightHeight, setRightHeight] = useState(null);

  const rightRef = useRef(null);

  const { addToCart } = useCart();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (!rightRef.current) return;

    const updateHeight = () => {
      setRightHeight(rightRef.current.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(rightRef.current);

    return () => observer.disconnect();
  }, [product]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${slug}/`);
      setProduct(res.data);
      
      // Fetch similar products from the same category
      if (res.data.category) {
        try {
          const similar = await api.get(
            `/products/?category=${res.data.category.slug}&page_size=10`
          );
          const allProducts = Array.isArray(similar.data.results) 
            ? similar.data.results 
            : (Array.isArray(similar.data) ? similar.data : []);
          
          // Filter out current product and limit to max 4
          const filtered = allProducts
            .filter(p => p.slug !== slug && p.id !== res.data.id)
            .slice(0, 4);
          
          setSimilarProducts(filtered);
        } catch (err) {
          console.error('Error fetching similar products:', err);
          setSimilarProducts([]);
        }
      } else {
        setSimilarProducts([]);
      }
      
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, quantity);
      showNotification('Added to cart', 'success');
    } catch {
      showNotification('Please login first', 'error');
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(product.id, quantity);
      window.location.href = '/checkout';
    } catch {
      showNotification('Please login first', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-purple-900 to-purple-800">
      <div className="container mx-auto px-4">

        {/* PRODUCT DETAIL GRID */}
        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* LEFT IMAGE (CAPPED) */}
          <div
  className="bg-white rounded-lg overflow-hidden group flex items-center justify-center"
  style={{ height: rightHeight ? `${rightHeight}px` : '500px' }}
>
  <div className="relative w-full h-full">

    {/* FIRST IMAGE */}
              <img
      src={product.image}
                alt={product.name}
      className="
        absolute inset-0
        w-full h-full
        object-contain
        transition-opacity
        duration-500
        opacity-100
        group-hover:opacity-0
      "
              />

    {/* SECOND IMAGE (HOVER) */}
              {Array.isArray(product.images) && product.images.length > 1 && (
  <img
    src={product.images[1]}
    alt={product.name}
        className="
          absolute inset-0
          w-full h-full
          object-contain
          transition-opacity
          duration-500
          opacity-0
          group-hover:opacity-100
        "
  />
)}

            </div>
          </div>



          {/* RIGHT CONTENT */}
          <div
            ref={rightRef}
            className="bg-white rounded-lg p-6"
          >
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            <div className="mb-4">
              <span className="text-yellow-400">★</span>
              <span className="ml-2">
                {product.rating || '4.3'} ({product.review_count || 0} reviews)
            </span>
          </div>

          <div className="mb-6">
              <span className="text-3xl font-bold text-purple-600">
                ₹{product.discount_price || product.price}
                </span>
              </div>

            <p className="mb-6 text-gray-700">
              {product.description}
            </p>

          <div className="mb-6">
              <label className="block mb-2 font-semibold">Quantity</label>
              <div className="flex gap-4 items-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 border rounded"
              >
                -
              </button>
                <span className="text-xl">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 border rounded"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
              className="w-full bg-purple-600 text-white py-3 rounded-lg mb-4"
          >
            Add to Cart
          </button>

          <button
            onClick={handleBuyNow}
              className="w-full bg-yellow-400 py-3 rounded-lg font-semibold"
          >
            Buy Now
          </button>
          </div>
        </div>

        {/* SIMILAR PRODUCTS */}
        {similarProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-white text-3xl font-bold text-center mb-8">
              Similar Products
            </h2>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {similarProducts.map(p => {
                const secondaryImage = Array.isArray(p.images) && p.images.length > 1
                  ? p.images[1]
                  : null;
                
                return (
                  <Link key={p.id} to={`/products/${p.slug}`} className="group">
                    <div className="bg-white rounded-lg shadow hover:shadow-xl transition overflow-hidden">
                      <div className="relative overflow-hidden">
                      <img
                          src={p.image || 'https://via.placeholder.com/300'}
                          alt={p.name}
                          className={`h-48 w-full object-contain p-4 transition-opacity duration-500 ${
                            secondaryImage ? 'opacity-100 group-hover:opacity-0' : ''
                          }`}
                        />
                        {secondaryImage && (
                          <img
                            src={secondaryImage}
                            alt={p.name}
                            className="absolute inset-0 h-48 w-full object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors">
                          {p.name}
                        </h3>
                      <div className="flex items-center justify-between">
                          <span className="text-purple-600 font-bold">
                            ₹{p.discount_price || p.price}
                          </span>
                          {p.discount_price && (
                            <span className="text-xs text-gray-500 line-through">
                              ₹{p.price}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>

            {/* View Products Button */}
            <div className="text-center">
              <Link
                to={`/products${product.category ? `?category=${product.category.slug}` : ''}`}
                className="inline-block bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors shadow-lg"
              >
                View More Products →
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductDetail;
