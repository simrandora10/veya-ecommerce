import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import heroIm from "../assets/image(7).png";
import heroImg from "../assets/home/image.png";
import heroImg1 from "../assets/home/1.png";
import heroImg2 from "../assets/home/2.png";
import heroImg3 from "../assets/home/3.png";
import heroImg4 from "../assets/home/4.png";
import heroImg5 from "../assets/home/5.png";
import heroImg6 from "../assets/home/6.png";
import ad1 from "../assets/home/ad1.png";
import ad2 from "../assets/home/ad2.png";
import ad3 from "../assets/home/ad3.png";
import ad4 from "../assets/home/ad4.png";
import { useCart } from "../context/CartContext";
import { useNotification } from "../components/Notification";

const Home = () => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [b2g2Products, setB2g2Products] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const ads = [ad1, ad2, ad3, ad4];
  const [currentAd, setCurrentAd] = useState(0);

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("bestsellers");
  const [b2g2Filter, setB2g2Filter] = useState("winter care");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [countdown, setCountdown] = useState({
    hours: 0,
    minutes: 11,
    seconds: 32,
  });
  const [currentPromoSlide, setCurrentPromoSlide] = useState(0);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Auto-rotate season's grand gift carousel every 5 seconds
  useEffect(() => {
    const carouselInterval = setInterval(() => {
      setCurrentPromoSlide((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(carouselInterval);
  }, []);
  const { addToCart } = useCart();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [trendingRes, bestsellerRes, b2g2Res, newRes, categoriesRes] =
        await Promise.all([
          api.get("/products/?trending=true&page_size=8"),
          api.get("/products/?bestseller=true&page_size=8"),
          api.get("/products/?page_size=12"),
          api.get("/products/?page_size=12"),
          api.get("/categories/"),
        ]);

      setTrendingProducts(
        Array.isArray(trendingRes.data.results)
          ? trendingRes.data.results
          : Array.isArray(trendingRes.data)
          ? trendingRes.data
          : []
      );
      setBestsellers(
        Array.isArray(bestsellerRes.data.results)
          ? bestsellerRes.data.results
          : Array.isArray(bestsellerRes.data)
          ? bestsellerRes.data
          : []
      );
      const allProducts = Array.isArray(b2g2Res.data.results)
        ? b2g2Res.data.results
        : Array.isArray(b2g2Res.data)
        ? b2g2Res.data
        : [];
      // Initial B2G2 products will be set by the filter effect
      const newProductsData = Array.isArray(newRes.data.results)
        ? newRes.data.results
        : Array.isArray(newRes.data)
        ? newRes.data
        : [];
      setNewProducts(newProductsData.slice(0, 4)); // Get 4 products for New on the shelves
      const categoriesData = Array.isArray(categoriesRes.data.results)
        ? categoriesRes.data.results
        : Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : [];
      setCategories(categoriesData);

      // Set initial B2G2 products if categories are loaded
      if (categoriesData.length > 0) {
        setB2g2Products(allProducts.slice(0, 4));
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filter products based on active filter
    let products = [];
    switch (activeFilter) {
      case "bestsellers":
        products = bestsellers;
        break;
      case "skincare":
        products = trendingProducts.filter(
          (p) =>
            p.category?.slug === "skin" ||
            p.category?.name?.toLowerCase().includes("skin")
        );
        break;
      case "bodycare":
        products = trendingProducts.filter(
          (p) =>
            p.category?.slug === "body" ||
            p.category?.name?.toLowerCase().includes("body")
        );
        break;
      case "haircare":
        products = trendingProducts.filter(
          (p) =>
            p.category?.slug === "hair" ||
            p.category?.name?.toLowerCase().includes("hair")
        );
        break;
      case "combos":
        products = trendingProducts.filter(
          (p) =>
            p.category?.slug === "gifting" ||
            p.category?.name?.toLowerCase().includes("gift")
        );
        break;
      default:
        products = bestsellers;
    }
    setFilteredProducts(products);
  }, [activeFilter, bestsellers, trendingProducts]);

  // Filter B2G2 products based on filter
  useEffect(() => {
    const filterB2G2Products = async () => {
      try {
        let apiUrl = "/products/?page_size=20";

        // Map filter names to category slugs
        const categorySlugMap = {
          haircare: "haircare",
          fragrances: "fragrances",
          bodycare: "bodycare",
        };

        // Try to match filter with category slugs first
        let categoryMatch = categories.find((cat) => {
          const filterLower = b2g2Filter.toLowerCase();
          const catNameLower = cat.name?.toLowerCase() || "";
          const catSlugLower = cat.slug?.toLowerCase() || "";
          return (
            catNameLower.includes(filterLower) ||
            catSlugLower.includes(filterLower.replace(" ", "-")) ||
            filterLower.includes(catNameLower) ||
            filterLower.includes(catSlugLower)
          );
        });

        // If no match, try the slug map
        if (!categoryMatch && categorySlugMap[b2g2Filter]) {
          categoryMatch = categories.find(
            (cat) => cat.slug === categorySlugMap[b2g2Filter]
          );
        }

        if (categoryMatch) {
          apiUrl = `/products/?category=${categoryMatch.slug}&page_size=20`;
        } else if (b2g2Filter === "new launches") {
          apiUrl = "/products/?page_size=20&ordering=-created_at";
        }

        const response = await api.get(apiUrl);
        const allProducts = Array.isArray(response.data.results)
          ? response.data.results
          : Array.isArray(response.data)
          ? response.data
          : [];

        // Filter products based on filter name if needed
        let filtered = allProducts;
        if (b2g2Filter === "winter care") {
          // Filter by winter-related keywords
          filtered = allProducts.filter(
            (p) =>
              p.name?.toLowerCase().includes("winter") ||
              p.description?.toLowerCase().includes("winter") ||
              (p.tags &&
                Array.isArray(p.tags) &&
                p.tags.some((tag) => tag.toLowerCase().includes("winter")))
          );
          // If no winter products, show all
          if (filtered.length === 0) filtered = allProducts;
        } else if (b2g2Filter === "dry skin") {
          filtered = allProducts.filter(
            (p) =>
              p.name?.toLowerCase().includes("dry") ||
              p.description?.toLowerCase().includes("dry") ||
              p.name?.toLowerCase().includes("moisturiz") ||
              p.description?.toLowerCase().includes("moisturiz")
          );
          if (filtered.length === 0) filtered = allProducts;
        } else if (b2g2Filter === "oily skin") {
          filtered = allProducts.filter(
            (p) =>
              p.name?.toLowerCase().includes("oil") ||
              p.description?.toLowerCase().includes("oil") ||
              p.name?.toLowerCase().includes("matte") ||
              p.description?.toLowerCase().includes("matte")
          );
          if (filtered.length === 0) filtered = allProducts;
        } else if (b2g2Filter === "acne prone") {
          filtered = allProducts.filter(
            (p) =>
              p.name?.toLowerCase().includes("acne") ||
              p.description?.toLowerCase().includes("acne") ||
              p.name?.toLowerCase().includes("blemish") ||
              p.description?.toLowerCase().includes("blemish") ||
              p.name?.toLowerCase().includes("clear") ||
              p.description?.toLowerCase().includes("clear")
          );
          if (filtered.length === 0) filtered = allProducts;
        }

        setB2g2Products(filtered.slice(0, 4));
      } catch (error) {
        console.error("Error filtering B2G2 products:", error);
        // Fallback to showing all products if filter fails
        try {
          const fallbackResponse = await api.get("/products/?page_size=20");
          const fallbackProducts = Array.isArray(fallbackResponse.data.results)
            ? fallbackResponse.data.results
            : Array.isArray(fallbackResponse.data)
            ? fallbackResponse.data
            : [];
          setB2g2Products(fallbackProducts.slice(0, 4));
        } catch (fallbackError) {
          console.error("Error fetching fallback products:", fallbackError);
        }
      }
    };

    if (categories.length > 0 || b2g2Filter) {
      filterB2G2Products();
    }
  }, [b2g2Filter, categories]);

  // Handle scroll tracking for scroll indicator
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth - container.clientWidth;
      const progress = scrollWidth > 0 ? (scrollLeft / scrollWidth) * 100 : 0;
      setScrollProgress(progress);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [filteredProducts]);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 6000); // 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-slide advertisement banner
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const handleAddToCart = async (productId, e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await addToCart(productId, 1);
      showNotification("Added to cart", "success");
    } catch (error) {
      showNotification("Please login to add items to cart", "error");
    }
  };

  const handleAddAllToCart = async () => {
    try {
      for (const product of b2g2Products) {
        await addToCart(product.id, 1);
      }
      showNotification("All products added to cart!", "success");
    } catch (error) {
      showNotification("Please login to add items to cart", "error");
    }
  };

  const ProductCard = ({ product, isCarousel = false, index = 0 }) => {
    // Calculate card width based on content length and index for variety
    const nameLength = product.name?.length || 0;
    const baseWidth = 280; // Base width in pixels
    const widthVariation = nameLength > 40 ? 60 : nameLength > 30 ? 40 : 0;
    const indexVariation = index % 3 === 0 ? 20 : index % 3 === 1 ? -10 : 0;
    const cardWidth = baseWidth + widthVariation + indexVariation;

    const secondaryImage =
      Array.isArray(product.images) && product.images.length > 1
        ? product.images[1]
        : null;

    return (
      <Link
        to={`/products/${product.slug}`}
        className={`group ${isCarousel ? "flex-shrink-0" : ""}`}
        style={isCarousel ? { width: `${cardWidth}px` } : {}}
      >
        <div
          className={`rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isCarousel ? "" : ""
          }`}
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
            backdropFilter: "blur(10px)",
            width: isCarousel ? "100%" : "auto",
          }}
        >
          <div className="relative overflow-hidden">
            <img
              src={product.image || "https://via.placeholder.com/300"}
              alt={product.name}
              className={`${
                isCarousel ? "w-full h-64" : "w-full h-64"
              } object-cover transition-opacity duration-500 ${
                secondaryImage ? "opacity-100 group-hover:opacity-0" : ""
              }`}
              style={{ position: secondaryImage ? 'relative' : 'static' }}
            />
            {secondaryImage && (
              <img
                src={secondaryImage}
                alt={product.name}
                className="absolute inset-0 w-full h-64 object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ zIndex: 1 }}
              />
            )}
            {product.is_trending && (
              <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded flex items-center gap-1">
                <span>🔥</span> TRENDING
              </span>
            )}
            {product.is_bestseller && (
              <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 text-xs font-bold rounded">
                BESTSELLER
              </span>
            )}
            {product.discount_percentage > 0 && (
              <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded">
                {product.discount_percentage}% OFF
              </span>
            )}
          </div>
          <div className="p-4">
            {/* Buy 2 Get 2 Free Banner */}
            <div className="bg-yellow-400 text-gray-900 text-center py-1 mb-2 text-xs font-bold rounded">
              buy 2 get 2 free
            </div>

            <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
              {product.name}
            </h3>
            <div className="flex items-center mb-2">
              <span className="text-yellow-400">★</span>
              <span className="text-sm text-gray-600 ml-1">
                {product.rating || "4.3"} ({product.review_count || "376"}{" "}
                reviews)
              </span>
              <span className="ml-2 text-blue-500">✓</span>
            </div>

            {/* Size Options */}
            <div className="flex gap-2 mb-3">
              <button className="px-3 py-1 text-xs border border-gray-300 rounded hover:border-purple-600 hover:text-purple-600">
                50 g
              </button>
              <button className="px-3 py-1 text-xs border border-gray-300 rounded hover:border-purple-600 hover:text-purple-600">
                400ml
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                {product.discount_price ? (
                  <div>
                    <span className="text-lg font-bold text-purple-600">
                      ₹{product.discount_price}
                    </span>
                    <span className="text-sm text-gray-500 line-through ml-2">
                      ₹{product.price}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-purple-600">
                    ₹{product.price}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => handleAddToCart(product.id, e)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                add to cart
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Category icons data
  const categoryIcons = [
    { name: "new drops", slug: "new", image: heroImg1 },
    { name: "skincare", slug: "skin", image: heroImg2 },
    { name: "bodycare", slug: "body", image: heroImg3 },
    { name: "fragrance", slug: "fragrances", image: heroImg4 },
    { name: "haircare", slug: "hair", image: heroImg5 },
    { name: "combos", slug: "gifting", image: heroImg6 },
  ];

  return (
    <div
      className="min-h-screen top-0 overflow-hidden w-full"
      style={{
        background:
          "linear-gradient(180deg, #581C87 0%, #6B21A8 25%, #7E22CE 50%, #6B21A8 75%, #581C87 100%)",
        backgroundImage:
          "radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(126, 34, 206, 0.4) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(107, 33, 168, 0.3) 0%, transparent 70%)",
        animation: "gradientShift 15s ease infinite",
        backgroundSize: "200% 200%",
      }}
    >
      {/* Global Sparkle/Confetti Effect - Whole Website */}

      <div className="relative z-10 w-full">
        {/* Announcement marquee just below header */}
        <div className="w-full overflow-hidden">
          {/* Inline CSS (keep once) */}
          <style>
            {`
      .marquee {
        display: flex;
        width: max-content;
        animation: marquee-scroll 22s linear infinite;
      }

      @keyframes marquee-scroll {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-50%);
        }
      }
    `}
          </style>

          <div className="fixed top-30 z-50 w-full bg-gradient-to-r from-amber-100 via-peachpuff-100 to-rose-100/80 border border-amber-200/60 py-2">
            <div className="flex overflow-hidden whitespace-nowrap">
              <div className="marquee text-xs md:text-sm font-medium text-amber-800">
                {/* FIRST SET */}
                <span className="mx-8">
                  Limited-time Veya offers · Glow kits, berry bliss, and more
                </span>
                <span className="mx-8">
                  Free gifts on select combos · While stocks last
                </span>
                <span className="mx-8">
                  Curated routines for glowing skin & hair
                </span>
                <span className="mx-8">
                  Build your own Veya ritual and save more
                </span>

                {/* DUPLICATE SET */}
                <span className="mx-8">
                  Limited-time Veya offers · Glow kits, berry bliss, and more
                </span>
                <span className="mx-8">
                  Free gifts on select combos · While stocks last
                </span>
                <span className="mx-8">
                  Curated routines for glowing skin & hair
                </span>
                <span className="mx-8">
                  Build your own Veya ritual and save more
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Promotion Section - hero image only */}
        <section className="relative mt-6 overflow-hidden w-full">
          {/* <div className="absolute -top-20 -right-16 z-10 overflow-visible">
  <img
    src={heroIm}
    alt="Veya Season Finale"
    className="w-60 h-60 object-cover -rotate-[140deg]"
  />
</div> */}

          <div
            className="inset-0 overflow-hidden pointer-events-none z-[-1]"
            style={{ zIndex: 1 }}
          >
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `sparkle ${
                    4 + Math.random() * 3
                  }s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 4}s`,
                }}
              >
                <span
                  className="text-yellow-300 text-xl md:text-2xl"
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(255, 255, 0, 0.9))",
                    animation: `twinkle ${
                      1.5 + Math.random() * 100
                    }s ease-in-out infinite alternate, float ${
                      3 + Math.random() * 2
                    }s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s, ${
                      Math.random() * 3
                    }s`,
                    willChange: "transform, opacity",
                  }}
                >
                  ✨
                </span>
              </div>
            ))}
          </div>
          {/* Single hero image using provided artwork */}
          <div className="relative overflow-hidden w-full">
            {/* HERO */}
            <section className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 md:py-8 lg:py-10 w-full max-w-full">
              {/* SCROLLING IMAGES SECTION - First */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center w-full mb-8 md:mb-12">
                <div className="relative w-full overflow-hidden rounded-3xl backdrop-blur-md">
                  {/* SLIDER */}
                  <div
                    className="flex transition-transform duration-700 ease-in-out -z-1"
                    style={{ transform: `translateX(-${currentAd * 100}%)` }}
                  >
                    {ads.map((ad, index) => (
                      <Link
                        key={index}
                        to="/products"
                        className="w-full flex-shrink-0 cursor-pointer"
                      >
                        <img
                          src={ad}
                          alt={`Ad ${index + 1}`}
                          className="w-full object-cover"
                        />
                      </Link>
                    ))}
                  </div>

                  {/* DOT INDICATORS */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {ads.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentAd(index)}
                        className={`h-2 w-2 rounded-full transition-all duration-300
                          ${
                            currentAd === index
                              ? "bg-white w-5"
                              : "bg-white/40 hover:bg-white/70"
                          }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* RIGHT PROMO CARD */}
                <div className="flex justify-center w-full">
                  <img
                    src={heroImg}
                    alt="Veya Season Finale"
                    className="
                      w-full
                      max-w-sm
                      md:max-w-xl
                      lg:max-w-2xl
                      xl:max-w-3xl
                      rounded-3xl
                      object-contain
                      drop-shadow-2xl
                    "
                  />
                </div>
              </div>

              {/* CATEGORY ICONS - Second */}
              <div
                className="
                grid
                grid-cols-3
                sm:grid-cols-3
                md:grid-cols-6
                gap-y-6
                gap-x-4
                md:gap-y-8
                md:gap-x-6
                justify-items-center
                w-full
              "
              >
                {categoryIcons.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={
                      cat.slug === "new"
                        ? "/products?new=true"
                        : `/products?category=${cat.slug}`
                    }
                    className="
                      flex
                      flex-col
                      items-center
                      text-center
                      w-full
                      max-w-[120px]
                      cursor-pointer
                      hover:scale-105
                      transition-transform
                      duration-300
                    "
                  >
                    {/* CIRCLE */}
                    <div
                      className="
                      w-20 h-20
                      md:w-24 md:h-24
                      rounded-full
                      border-2 border-yellow-400
                      flex items-center justify-center
                      mb-2
                      shrink-0
                      hover:border-yellow-300
                      transition-colors
                    "
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-18 h-18 md:w-22 md:h-22 object-contain"
                      />
                    </div>

                    {/* LABEL */}
                    <span
                      className="
                      text-xs
                      font-semibold
                      text-gray-800
                      uppercase
                      tracking-wide
                      leading-tight
                    "
                    >
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          
        </section>

        {/* Flash Sale / Season Finale box removed per requirements */}

        {/* Scrollable Product Section with Filter Buttons */}
        <section className="py-6 md:py-8 lg:py-10 relative overflow-hidden w-full">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 w-full max-w-full">
            {/* The Best of Plums Banner */}
            <div className="relative mb-6 md:mb-8 w-full flex justify-center items-center">
              <div
                className="relative inline-block mx-auto"
                style={{
                  background:
                    "linear-gradient(135deg, #6B21A8 0%, #7E22CE 100%)",
                  border: "3px solid #FCD34D",
                  borderRadius: "8px",
                  padding: "12px 24px",
                }}
              >
                <div className="absolute -top-2 -left-2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <div className="absolute -top-2 -right-2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-yellow-400 text-center">
                  the best of veya
                </h3>
              </div>
            </div>
            {/* Filter Buttons - Centered */}
            <div className="flex justify-center gap-2 mb-4 md:mb-6 overflow-x-auto pb-2 w-full">
              {[
                "bestsellers",
                "skincare",
                "bodycare",
                "haircare",
                "combos",
              ].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all transform hover:scale-105 ${
                    activeFilter === filter
                      ? "bg-yellow-400 text-gray-900 shadow-lg"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Scrollable Product Cards - Centered */}
            <div className="relative flex flex-col items-center w-full">
              <div
                ref={scrollContainerRef}
                className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide w-full"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isCarousel={true}
                      index={index}
                    />
                  ))
                ) : (
                  <div className="text-center text-white py-12 w-full">
                    No products found in this category
                  </div>
                )}
              </div>

              {/* Dynamic Scroll Indicator - Above View All Button */}
              <div className="w-full mt-4 mb-2">
                <div className="relative h-1 bg-purple-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
              </div>

              {/* View All Products Card - At Bottom */}
              <div className="text-center mt-4">
                <Link to="/products" className="inline-block group">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-12 py-6 rounded-xl font-bold hover:from-purple-700 hover:to-purple-900 transition-all duration-300 shadow-2xl transform hover:scale-105 hover:-translate-y-1">
                    <div className="flex items-center gap-3 justify-center">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <span className="text-lg">View All Products</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm mt-2 text-purple-200">
                      Explore our complete collection
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Season's Grand Gift Promotional Banner */}
        <section className="py-6 md:py-8 w-full">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col justify-center items-center w-full max-w-full">
            {/* Header Banner */}
            <div className="relative mb-4 md:mb-6 w-full flex justify-center items-center">
              <div
                className="relative inline-block mx-auto border-4 border-yellow-400 rounded-lg overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #581C87 0%, #6B21A8 50%, #7E22CE 100%)",
                  padding: "12px 24px",
                }}
              >
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white text-center">
                  the season's grand gift
                </h2>
              </div>
            </div>

            {/* Main Promotional Banner Carousel */}
            <div
              className="relative rounded-lg overflow-hidden border-4 border-purple-400 w-full max-w-5xl mx-auto origin-top"
              style={{
                background:
                  "linear-gradient(135deg, #581C87 0%, #6B21A8 50%, #7E22CE 100%)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="relative overflow-hidden">
                {/* Carousel Slides */}
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPromoSlide * 100}%)`,
                  }}
                >
                  {/* Slide 1: Free Shampoo */}
<Link
  to="/products"
  className="min-w-full block cursor-pointer hover:opacity-95 transition-opacity"
>
  <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 items-center">

    <div>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
        FREE shampoo*
      </h3>

      <p className="text-lg md:text-xl text-yellow-300 font-semibold mb-2">
        above ₹699
      </p>

      <p className="text-purple-200 mb-5">
        get a free full-size shampoo with your order.
      </p>

      <div className="inline-flex items-center gap-2 bg-purple-700 px-7 py-3 rounded-xl font-semibold hover:bg-purple-800 transition">
        shop now <span>→</span>
      </div>

      <p className="text-xs text-purple-200 mt-4">
        *while stocks last
      </p>
    </div>

    <div className="flex justify-center">
      <div className="w-56 h-56 bg-purple-200 rounded-2xl flex items-center justify-center shadow-2xl">
        <img src="/one.jpeg" className="w-[90%] h-[90%] object-contain" />
      </div>
    </div>

  </div>
</Link>


                  {/* Slide 2: Free Perfume */}
<Link
  to="/products"
  className="min-w-full block cursor-pointer hover:opacity-95 transition-opacity"
>
  <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 items-center">

    <div>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
        FREE full-size perfume*
      </h3>

      <p className="text-lg md:text-xl text-yellow-300 font-semibold mb-2">
        above ₹1299
      </p>

      <p className="text-purple-200 mb-5">
        get a complimentary full-size perfume.
      </p>

      <div className="inline-flex items-center gap-2 bg-purple-700 px-7 py-3 rounded-xl font-semibold hover:bg-purple-800 transition">
        shop now <span>→</span>
      </div>

      <p className="text-xs text-purple-200 mt-4">
        *on orders above ₹1299
      </p>
    </div>

    <div className="flex justify-center">
      <div className="w-56 h-56 bg-purple-200 rounded-2xl flex items-center justify-center shadow-2xl">
        <img src="/two.jpeg" className="w-[90%] h-[90%] object-contain" />
      </div>
    </div>

  </div>
</Link>


                  {/* Slide 3: Free Ring Light */}
<Link
  to="/products"
  className="min-w-full block cursor-pointer hover:opacity-95 transition-opacity"
>
  <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 items-center">

    <div>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
        FREE selfie ring light*
      </h3>

      <p className="text-lg md:text-xl text-yellow-300 font-semibold mb-2">
        above ₹1999
      </p>

      <p className="text-purple-200 mb-5">
        get a free selfie ring light with your purchase.
      </p>

      <div className="inline-flex items-center gap-2 bg-purple-700 px-7 py-3 rounded-xl font-semibold hover:bg-purple-800 transition">
        shop now <span>→</span>
      </div>

      <p className="text-xs text-purple-200 mt-4">
        *color may vary
      </p>
    </div>

    <div className="flex justify-center">
      <div className="w-56 h-56 bg-purple-200 rounded-2xl flex items-center justify-center shadow-2xl">
        <img src="/three.png" className="w-[90%] h-[90%] object-contain" />
      </div>
    </div>

  </div>
</Link>

                </div>
              </div>

              {/* Carousel Indicators */}
            </div>
            <div className="flex pt-4 justify-center gap-2 pb-4 w-full">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPromoSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentPromoSlide === index
                      ? "bg-yellow-400 w-8"
                      : "bg-purple-600 w-2"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* New on the Shelves Section */}
        <section className="py-6 md:py-8 lg:py-10 w-full">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 w-full max-w-full">
            {/* Header Banner */}
            <div className="relative mb-6 md:mb-8 w-full flex justify-center items-center">
              <div
                className="relative inline-block mx-auto border-4 border-yellow-400 rounded-lg overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #581C87 0%, #6B21A8 50%, #7E22CE 100%)",
                  padding: "12px 24px",
                }}
              >
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-2xl">
                  ✨
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white text-center">
                  new on the shelves
                </h2>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 w-full">
              {newProducts.map((product, index) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="group w-full"
                >
                  <div
                    className="bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full h-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image || "https://via.placeholder.com/300"}
                        alt={product.name}
                        className={`w-full h-64 object-contain bg-gradient-to-br from-purple-50 to-pink-50 transition-opacity duration-500 ${
                          Array.isArray(product.images) &&
                          product.images.length > 1
                            ? "opacity-100 group-hover:opacity-0"
                            : ""
                        }`}
                      />
                      {Array.isArray(product.images) &&
                        product.images.length > 1 && (
                          <img
                            src={product.images[1]}
                            alt={product.name}
                            className="absolute inset-0 w-full h-64 object-contain bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          />
                        )}
                      <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 text-xs font-bold rounded">
                        new launch!
                      </span>
                    </div>
                    <div className="p-4">
                      {/* Buy 2 Get 2 Free Banner */}
                      <div className="bg-yellow-400 text-gray-900 text-center py-1 mb-2 text-xs font-bold rounded">
                        buy 2 get 2 free
                      </div>

                      <div className="flex items-center mb-2">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {product.rating || "4.3"} (
                          {product.review_count || "38"} reviews)
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {product.description || "Premium quality product"}
                      </p>

                      {/* Size Options */}
                      <div className="flex gap-2 mb-3">
                        <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors">
                          50 g
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-purple-600">
                          ₹{product.price || "499"}
                        </span>
                        <button
                          onClick={(e) => handleAddToCart(product.id, e)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          add to cart
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Products Card */}
            <div className="text-center">
              <Link to="/products" className="inline-block group">
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-12 py-6 rounded-xl font-bold hover:from-purple-700 hover:to-purple-900 transition-all duration-300 shadow-2xl transform hover:scale-105 hover:-translate-y-1">
                  <div className="flex items-center gap-3 justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span className="text-lg">View All Products</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm mt-2 text-purple-200">
                    Explore our complete collection
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* B2G2 Picks: Grab & Go Section */}
        <section className="py-6 md:py-8 lg:py-10 relative w-full">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 w-full max-w-full">
            {/* B2G2 Picks Banner */}
            <div className="relative mb-6 md:mb-8 align-center justify-center w-full flex justify-center items-center">
              <div
                className="relative inline-block mx-auto border-4 border-yellow-400 rounded-lg overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #581C87 0%, #6B21A8 50%, #7E22CE 100%)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                  padding: "16px 32px",
                }}
              >
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-3xl">
                  ✨
                </div>
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-3xl">
                  ✨
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                  B2G2 picks: grab & go
                </h2>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-6 md:mb-8 w-full">
              {[
                "winter care",
                "new launches",
                "dry skin",
                "oily skin",
                "haircare",
                "fragrances",
                "bodycare",
                "acne prone",
              ].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setB2g2Filter(filter)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-105 ${
                    b2g2Filter === filter
                      ? "bg-yellow-400 text-gray-900 shadow-lg"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Product Grid - 2x2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto relative w-full">
              {b2g2Products.map((product, index) => (
                <div key={product.id} className="relative w-full">
                  <Link
                    to={`/products/${product.slug}`}
                    className="block w-full h-full"
                  >
                    <div
                      className="bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full h-full"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4">
                        {/* Product Image */}
                        <div className="relative overflow-hidden">
                          <img
                            src={
                              product.image || "https://via.placeholder.com/200"
                            }
                            alt={product.name}
                            className={`w-full h-40 md:h-48 object-contain rounded-lg transition-opacity duration-500 ${
                              Array.isArray(product.images) &&
                              product.images.length > 1
                                ? "opacity-100 group-hover:opacity-0"
                                : ""
                            }`}
                          />
                          {Array.isArray(product.images) &&
                            product.images.length > 1 && (
                              <img
                                src={product.images[1]}
                                alt={product.name}
                                className="absolute inset-0 w-full h-40 md:h-48 object-contain rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                              />
                            )}
                          {product.is_trending && (
                            <span className="absolute top-2 left-2 bg-pink-500 text-white px-2 py-1 text-xs font-bold rounded flex items-center gap-1">
                              <span>☀️</span> trending
                            </span>
                          )}
                          {index === 0 && (
                            <span className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded">
                              new launch!
                            </span>
                          )}
                          <span className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded">
                            FREE
                          </span>
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="flex items-center mb-2">
                              <span className="text-yellow-400 text-lg">★</span>
                              <span className="text-sm text-gray-700 ml-1">
                                {product.rating || "4.0"} (
                                {product.review_count || "27"} reviews)
                              </span>
                              <span className="ml-2 text-blue-500">✓</span>
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
                              {product.name}
                            </h3>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                              {product.description || "Premium quality product"}
                            </p>
                            {product.price && (
                              <p className="text-lg font-bold text-purple-600">
                                ₹ {product.price}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddToCart(product.id, e);
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium mt-2"
                          >
                            add to cart
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}

              {/* Central Add to Cart Button - Overlapping */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block">
                <button
                  onClick={handleAddAllToCart}
                  className="w-24 h-24 bg-purple-700 border-4 border-yellow-400 rounded-full text-white font-bold text-sm hover:bg-purple-800 transition-all transform hover:scale-110 shadow-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #6B21A8 0%, #7E22CE 100%)",
                  }}
                >
                  add to cart
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
