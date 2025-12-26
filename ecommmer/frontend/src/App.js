import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Blogs from './pages/Blogs';
import About from './pages/About';
import Help from './pages/Help';
import Careers from './pages/Careers';
import BulkOrders from './pages/BulkOrders';
import ForgotPassword from './pages/ForgotPassword';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './components/Notification';
import PhoneOtpModal from './components/PhoneOtpModal';
import PhoneOtpPage from './pages/PhoneOtpPage';
import CartSidebar from './components/CartSidebar';
import OrderTracking from './pages/OrderTracking';

function App() {
  return (
    <NotificationProvider>
      <CartProvider>
        <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/bulk-orders" element={<BulkOrders />} />
            <Route path="/verify-otp" element={<PhoneOtpPage />} />
            <Route path="/track-order/:orderId?" element={<OrderTracking />} />
          </Routes>
          <CartSidebar />
          <PhoneOtpModal />
          <Footer />
        </div>
      </Router>
    </CartProvider>
    </NotificationProvider>
  );
}

export default App;

