# Inventory Management System

A comprehensive Spring Boot inventory management application with multi-company support, product management, user authentication, and **Purchase Order Management** with automatic inventory tracking.

## 🎯 Key Features

### Core Functionality
- 🏢 **Multi-Company Support** - Manage multiple companies independently
- 📦 **Product Management** - Organize products with categories, types, and images
- 👥 **User Management** - User authentication with JWT and role-based access
- 🔐 **Role-Based Access Control** - Screen-level permissions and role management
- 📊 **Inventory Tracking** - Real-time stock level management

### Purchase Order Management ⭐ (NEW)
- 📝 **Create & Manage Purchase Orders** - Full CRUD operations
- 📦 **Line Item Management** - Add/remove items with pricing
- 📥 **Receive Inventory** - Process deliveries and update stock
- 📈 **Progress Tracking** - Visual indicators for partial receipts
- 🔄 **Automatic Updates** - Stock levels update when inventory received
- 🏷️ **Status Management** - PENDING, RECEIVED, CANCELLED states
- 🔍 **Filtering & Search** - Filter by company, supplier, status

## 🚀 Quick Start

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- MySQL 8.0 or higher

### Setup & Run

```bash
cd inventory-management
mvn clean install
mvn spring-boot:run
```

Access at: `http://localhost:8080`

## 📚 Documentation

- **[PURCHASE_ORDERS.md](PURCHASE_ORDERS.md)** - Purchase Order feature guide
- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical overview

## 🎨 Quick Access

- **Home**: `http://localhost:8080`
- **Purchase Orders**: `http://localhost:8080/purchase-orders.html` ⭐
- **Products**: `http://localhost:8080/product.html`
- **Companies**: `http://localhost:8080/company.html`
- **Users**: `http://localhost:8080/user.html`

## 💾 Database

- MySQL 8.0+
- Automatic schema creation via JPA
- Configuration in `application.properties`

## 🔐 Security

- JWT token-based authentication
- Role-based access control
- Screen-level permissions
- Password encryption

## 🛠️ Build

```bash
mvn clean package      # Create JAR
java -jar target/inventory-management-0.0.1-SNAPSHOT.jar  # Run JAR
```

## 📋 Features Overview

| Feature | Status |
|---------|--------|
| Multi-Company Management | ✅ Complete |
| Product Management | ✅ Complete |
| User Authentication | ✅ Complete |
| Role & Permissions | ✅ Complete |
| Inventory Tracking | ✅ Complete |
| **Purchase Orders** | ✅ **NEW** |
| **Inventory Receipt** | ✅ **NEW** |

## 🚀 Technology Stack

- **Backend**: Spring Boot 3.3.0, Java 17, Hibernate JPA
- **Database**: MySQL 8.0
- **Auth**: JWT Tokens
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Build**: Maven

---

**Status**: ✅ Production Ready | **Version**: 0.0.1-SNAPSHOT

For detailed information on Purchase Orders, see [PURCHASE_ORDERS.md](PURCHASE_ORDERS.md)
