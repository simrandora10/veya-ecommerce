import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useNotification } from '../components/Notification';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    skin_type: '',
    trending: false,
    bestseller: false,
  });

  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { showNotification } = useNotification();

  useEffect(() => {
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    if (category) setFilters((prev) => ({ ...prev, category }));
    if (search) setFilters((prev) => ({ ...prev, search }));
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      const data = Array.isArray(res.data.results)
        ? res.data.results
        : res.data;
      setCategories(data || []);
    } catch (err) {
      setCategories([]);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.skin_type) params.append('skin_type', filters.skin_type);
      if (filters.trending) params.append('trending', 'true');
      if (filters.bestseller) params.append('bestseller', 'true');

      const res = await api.get(`/products/?${params.toString()}`);
      const data = Array.isArray(res.data.results)
        ? res.data.results
        : res.data;
      setProducts(data || []);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(id, 1);
      showNotification('Added to cart', 'success');
    } catch {
      showNotification('Please login to add items to cart', 'error');
    }
  };

  const ProductCard = ({ product }) => {
    const secondaryImage = Array.isArray(product.images) && product.images.length > 1
      ? product.images[1]
      : null;

    return (
      <Link to={`/products/${product.slug}`} className="group">
        <div className="rounded-lg shadow-md hover:shadow-xl transition-all bg-white overflow-hidden h-full flex flex-col">
          <div className="relative overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-64 object-cover transition-opacity duration-500 ${
                secondaryImage ? 'opacity-100 group-hover:opacity-0' : ''
              }`}
            />
            {secondaryImage && (
              <img
                src={secondaryImage}
                alt={product.name}
                className="absolute inset-0 w-full h-64 object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
            )}

            {product.is_trending && (
              <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                TRENDING 🔥
              </span>
            )}

            {product.is_bestseller && (
              <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                BESTSELLER
              </span>
            )}

            {product.discount_percentage > 0 && (
              <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                {product.discount_percentage}% OFF
              </span>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-semibold mb-2 line-clamp-2">
              {product.name}
            </h3>

            <div className="text-sm text-gray-600 mb-2">
              ★ {product.rating} ({product.review_count} reviews)
            </div>

            <div className="mt-auto">
              {product.discount_price ? (
                <>
                  <div className="text-purple-600 font-bold text-lg">
                    ₹{product.discount_price}
                  </div>
                  <div className="text-xs line-through text-gray-500">
                    ₹{product.price}
                  </div>
                </>
              ) : (
                <div className="text-purple-600 font-bold text-lg">
                  ₹{product.price}
                </div>
              )}

              {/* ✅ ONLY BUTTON ADJUSTED */}
              <button
                onClick={(e) => handleAddToCart(product.id, e)}
                className="mt-3 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-purple-100 py-8">
      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          
          {/* ✅ LEFT FILTERS (UNCHANGED) */}
          <aside className="w-64 bg-white p-6 rounded-lg h-fit sticky top-20">
            <h2 className="text-xl font-bold mb-4">Filters</h2>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Categories</h3>
              <label className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={filters.category === ''}
                  onChange={() =>
                    setFilters({ ...filters, category: '' })
                  }
                  className="mr-2"
                />
                All Categories
              </label>

              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center mb-2">
                  <input
                    type="radio"
                    checked={filters.category === cat.slug}
                    onChange={() =>
                      setFilters({ ...filters, category: cat.slug })
                    }
                    className="mr-2"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </aside>

          {/* PRODUCTS */}
          <main className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Products</h1>
            <p className="mb-6 text-gray-600">
              {products.length} products found
            </p>

            {loading ? (
              <div className="text-center py-20">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
