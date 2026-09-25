import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import os

# Configure plot
fig, ax = plt.subplots(figsize=(48, 29), dpi=150)
fig.patch.set_facecolor('#0b0f19')  # Deep dark navy background
ax.set_facecolor('#0b0f19')

# Canvas limits
ax.set_xlim(0, 3600)
ax.set_ylim(2650, 0)  # Inverted Y for top-down coordinates
ax.axis('off')

# Title & Subtitle
ax.text(1800, 65, "SHOES STORE APP - DATABASE ARCHITECTURE (ERD)", 
        fontsize=34, fontweight='bold', color='#f8fafc', ha='center', va='center', fontfamily='sans-serif')
ax.text(1800, 115, "Hệ thống Bán giày đa nền tảng: Phân quyền RBAC (Roles & Permissions) | Web Admin | Mobile App | Reviews & Q&A | Python AI", 
        fontsize=18, color='#94a3b8', ha='center', va='center', fontfamily='sans-serif')

# Color themes by domain
THEMES = {
    'RBAC': {'header': '#4f46e5', 'border': '#6366f1', 'bg': '#1e293b'},        # Indigo (Roles & Permissions)
    'AUTH': {'header': '#2563eb', 'border': '#3b82f6', 'bg': '#1e293b'},        # Blue (Users & Addresses)
    'PRODUCT': {'header': '#059669', 'border': '#10b981', 'bg': '#1e293b'},     # Emerald (Products & Catalog)
    'VARIANT': {'header': '#7c3aed', 'border': '#8b5cf6', 'bg': '#1e293b'},     # Violet (Variants & Stock)
    'ORDER': {'header': '#d97706', 'border': '#f59e0b', 'bg': '#1e293b'},       # Amber (Orders & Checkout)
    'REVIEW': {'header': '#e11d48', 'border': '#f43f5e', 'bg': '#1e293b'},      # Rose (Reviews)
    'COMMENT': {'header': '#0284c7', 'border': '#38bdf8', 'bg': '#1e293b'},     # Sky Blue (Comments & Q&A)
    'AI': {'header': '#0891b2', 'border': '#06b6d4', 'bg': '#1e293b'},          # Cyan (AI)
}

# Tables definitions
tables = {
    # COLUMN 1: RBAC & PHÂN QUYỀN
    'roles': {
        'x': 50, 'y': 170, 'w': 500, 'domain': 'RBAC',
        'title': 'ROLES (Vai trò người dùng)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('UK', 'name', 'VARCHAR(50) (Admin, Staff...)', '#38bdf8'),
            ('', 'description', 'VARCHAR(255)', '#cbd5e1'),
            ('', 'is_system', 'BOOLEAN (Khóa xóa gốc)', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'role_permissions': {
        'x': 50, 'y': 520, 'w': 500, 'domain': 'RBAC',
        'title': 'ROLE_PERMISSIONS (Bảng gán quyền)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'role_id', 'UUID -> roles.id', '#818cf8'),
            ('FK', 'permission_id', 'UUID -> permissions.id', '#818cf8'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'permissions': {
        'x': 50, 'y': 840, 'w': 500, 'domain': 'RBAC',
        'title': 'PERMISSIONS (Danh mục quyền hạn)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('', 'name', 'VARCHAR(100) (Duyệt đơn...)', '#cbd5e1'),
            ('UK', 'code', 'VARCHAR(50) (ORDER_APPROVE)', '#38bdf8'),
            ('', 'module', 'VARCHAR(50) (PRODUCT, ORDER)', '#f472b6'),
            ('', 'description', 'VARCHAR(255)', '#94a3b8')
        ]
    },
    'notifications': {
        'x': 50, 'y': 1220, 'w': 500, 'domain': 'AUTH',
        'title': 'NOTIFICATIONS (Thông báo)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('', 'title', 'VARCHAR(200)', '#cbd5e1'),
            ('', 'body', 'TEXT', '#94a3b8'),
            ('', 'type', 'ENUM(ORDER, REPLY, PROMO)', '#f472b6'),
            ('', 'reference_id', 'VARCHAR(100)', '#94a3b8'),
            ('', 'is_read', 'BOOLEAN', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'wishlists': {
        'x': 50, 'y': 1690, 'w': 500, 'domain': 'AUTH',
        'title': 'WISHLISTS (Sản phẩm yêu thích)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'product_id', 'UUID -> products.id', '#60a5fa'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },

    # COLUMN 2: USERS & ADDRESSES
    'users': {
        'x': 600, 'y': 170, 'w': 520, 'domain': 'AUTH',
        'title': 'USERS (Người dùng & Nhân viên)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'role_id', 'UUID -> roles.id', '#818cf8'),
            ('', 'full_name', 'VARCHAR(100)', '#cbd5e1'),
            ('UK', 'email', 'VARCHAR(150)', '#38bdf8'),
            ('', 'password_hash', 'VARCHAR(255)', '#94a3b8'),
            ('', 'phone', 'VARCHAR(20)', '#cbd5e1'),
            ('', 'avatar_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8'),
            ('', 'updated_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'user_addresses': {
        'x': 600, 'y': 690, 'w': 520, 'domain': 'AUTH',
        'title': 'USER_ADDRESSES (Sổ địa chỉ)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('', 'recipient_name', 'VARCHAR(100)', '#cbd5e1'),
            ('', 'recipient_phone', 'VARCHAR(20)', '#cbd5e1'),
            ('', 'street_address', 'VARCHAR(255)', '#cbd5e1'),
            ('', 'ward', 'VARCHAR(100)', '#94a3b8'),
            ('', 'district', 'VARCHAR(100)', '#94a3b8'),
            ('', 'province_city', 'VARCHAR(100)', '#cbd5e1'),
            ('', 'is_default', 'BOOLEAN', '#4ade80')
        ]
    },
    'suppliers': {
        'x': 600, 'y': 1200, 'w': 520, 'domain': 'PRODUCT',
        'title': 'SUPPLIERS (Nhà cung cấp)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('', 'name', 'VARCHAR(150)', '#cbd5e1'),
            ('', 'contact_email', 'VARCHAR(150)', '#cbd5e1'),
            ('', 'phone', 'VARCHAR(20)', '#cbd5e1'),
            ('', 'address', 'TEXT', '#94a3b8')
        ]
    },

    # COLUMN 3: CATALOG & PRODUCTS
    'categories': {
        'x': 1170, 'y': 170, 'w': 530, 'domain': 'PRODUCT',
        'title': 'CATEGORIES (Danh mục giày)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('', 'name', 'VARCHAR(100)', '#cbd5e1'),
            ('UK', 'slug', 'VARCHAR(120)', '#38bdf8'),
            ('', 'description', 'TEXT', '#94a3b8'),
            ('', 'image_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80')
        ]
    },
    'brands': {
        'x': 1170, 'y': 550, 'w': 530, 'domain': 'PRODUCT',
        'title': 'BRANDS (Thương hiệu: Nike, Adidas...)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('', 'name', 'VARCHAR(100)', '#cbd5e1'),
            ('UK', 'slug', 'VARCHAR(120)', '#38bdf8'),
            ('', 'logo_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'description', 'TEXT', '#94a3b8')
        ]
    },
    'products': {
        'x': 1170, 'y': 920, 'w': 530, 'domain': 'PRODUCT',
        'title': 'PRODUCTS (Sản phẩm giày)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'category_id', 'UUID -> categories.id', '#34d399'),
            ('FK', 'brand_id', 'UUID -> brands.id', '#34d399'),
            ('FK', 'supplier_id', 'UUID -> suppliers.id', '#34d399'),
            ('', 'name', 'VARCHAR(200)', '#cbd5e1'),
            ('UK', 'slug', 'VARCHAR(220)', '#38bdf8'),
            ('', 'description', 'TEXT', '#94a3b8'),
            ('', 'gender', 'ENUM(MEN, WOMEN, UNISEX)', '#f472b6'),
            ('', 'base_price', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'size_guide_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'product_images': {
        'x': 1170, 'y': 1580, 'w': 530, 'domain': 'PRODUCT',
        'title': 'PRODUCT_IMAGES (Bộ sưu tập ảnh)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'product_id', 'UUID -> products.id', '#34d399'),
            ('', 'image_url', 'VARCHAR(255)', '#cbd5e1'),
            ('', 'is_thumbnail', 'BOOLEAN', '#4ade80'),
            ('', 'sort_order', 'INT', '#94a3b8')
        ]
    },

    # COLUMN 4: SHOE VARIANTS, INVENTORY, CART, VOUCHERS
    'product_variants': {
        'x': 1750, 'y': 170, 'w': 540, 'domain': 'VARIANT',
        'title': 'PRODUCT_VARIANTS (Biến thể Size & Màu)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'product_id', 'UUID -> products.id', '#34d399'),
            ('UK', 'sku', 'VARCHAR(50)', '#38bdf8'),
            ('', 'size', 'VARCHAR(10) (Size 36 - 45)', '#c084fc'),
            ('', 'color', 'VARCHAR(50) (Black, White...)', '#c084fc'),
            ('', 'price', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'stock_quantity', 'INT (Tồn kho riêng)', '#4ade80'),
            ('', 'image_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80')
        ]
    },
    'inventory_transactions': {
        'x': 1750, 'y': 690, 'w': 540, 'domain': 'VARIANT',
        'title': 'INVENTORY_TRANSACTIONS (Kho hàng)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'variant_id', 'UUID -> product_variants.id', '#a78bfa'),
            ('FK', 'staff_id', 'UUID -> users.id', '#60a5fa'),
            ('', 'type', 'ENUM(IMPORT, EXPORT, ADJUST)', '#f472b6'),
            ('', 'quantity', 'INT', '#cbd5e1'),
            ('', 'notes', 'TEXT', '#94a3b8'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'cart_items': {
        'x': 1750, 'y': 1170, 'w': 540, 'domain': 'VARIANT',
        'title': 'CART_ITEMS (Giỏ hàng của khách)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'variant_id', 'UUID -> product_variants.id', '#a78bfa'),
            ('', 'quantity', 'INT', '#cbd5e1'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'vouchers': {
        'x': 1750, 'y': 1570, 'w': 540, 'domain': 'ORDER',
        'title': 'VOUCHERS (Mã giảm giá khuyến mãi)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('UK', 'code', 'VARCHAR(50)', '#38bdf8'),
            ('', 'title', 'VARCHAR(150)', '#cbd5e1'),
            ('', 'discount_type', 'ENUM(PERCENT, FIXED)', '#f472b6'),
            ('', 'discount_value', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'min_order_value', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'max_discount_amount', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'usage_limit', 'INT', '#cbd5e1'),
            ('', 'used_count', 'INT', '#94a3b8'),
            ('', 'start_date', 'TIMESTAMP', '#94a3b8'),
            ('', 'end_date', 'TIMESTAMP', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80')
        ]
    },
    'banners': {
        'x': 1750, 'y': 2180, 'w': 540, 'domain': 'AUTH',
        'title': 'BANNERS (Banner quảng cáo trang chủ)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('', 'title', 'VARCHAR(150)', '#cbd5e1'),
            ('', 'image_url', 'VARCHAR(255)', '#cbd5e1'),
            ('', 'link_url', 'VARCHAR(255)', '#94a3b8'),
            ('', 'sort_order', 'INT', '#94a3b8'),
            ('', 'is_active', 'BOOLEAN', '#4ade80')
        ]
    },

    # COLUMN 5: ORDERS & AI RECOMMENDER
    'orders': {
        'x': 2340, 'y': 170, 'w': 560, 'domain': 'ORDER',
        'title': 'ORDERS (Đơn đặt hàng)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('UK', 'order_code', 'VARCHAR(50)', '#38bdf8'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'voucher_id', 'UUID -> vouchers.id', '#fbbf24'),
            ('', 'recipient_name', 'VARCHAR(100)', '#cbd5e1'),
            ('', 'recipient_phone', 'VARCHAR(20)', '#cbd5e1'),
            ('', 'shipping_address', 'TEXT', '#cbd5e1'),
            ('', 'payment_method', 'ENUM(COD, MOMO, VIETQR)', '#f472b6'),
            ('', 'payment_status', 'ENUM(UNPAID, PAID, REFUNDED)', '#f472b6'),
            ('', 'order_status', 'ENUM(PENDING, SHIPPING...)', '#f472b6'),
            ('', 'subtotal_amount', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'discount_amount', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'shipping_fee', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'total_amount', 'DECIMAL(12,2)', '#4ade80'),
            ('', 'notes', 'TEXT', '#94a3b8'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'order_items': {
        'x': 2340, 'y': 1020, 'w': 560, 'domain': 'ORDER',
        'title': 'ORDER_ITEMS (Chi tiết mặt hàng đặt)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'order_id', 'UUID -> orders.id', '#fbbf24'),
            ('FK', 'variant_id', 'UUID -> product_variants.id', '#a78bfa'),
            ('', 'product_name', 'VARCHAR(200)', '#cbd5e1'),
            ('', 'size', 'VARCHAR(10)', '#c084fc'),
            ('', 'color', 'VARCHAR(50)', '#c084fc'),
            ('', 'unit_price', 'DECIMAL(12,2)', '#fbbf24'),
            ('', 'quantity', 'INT', '#cbd5e1'),
            ('', 'total_price', 'DECIMAL(12,2)', '#4ade80')
        ]
    },
    'user_recommendations': {
        'x': 2340, 'y': 1580, 'w': 560, 'domain': 'AI',
        'title': 'USER_RECOMMENDATIONS (AI Gợi ý giày)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'product_id', 'UUID -> products.id', '#34d399'),
            ('AI', 'match_score', 'FLOAT (Độ tương thích)', '#38bdf8'),
            ('AI', 'algorithm', 'VARCHAR(50) (Collaborative)', '#38bdf8'),
            ('', 'updated_at', 'TIMESTAMP', '#94a3b8')
        ]
    },

    # COLUMN 6: ĐÁNH GIÁ (REVIEWS) & BÌNH LUẬN (COMMENTS & Q&A)
    'reviews': {
        'x': 2950, 'y': 170, 'w': 600, 'domain': 'REVIEW',
        'title': 'REVIEWS (Đánh giá & Sentiment AI NLP)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'product_id', 'UUID -> products.id', '#34d399'),
            ('FK', 'order_item_id', 'UUID -> order_items.id', '#fbbf24'),
            ('', 'rating', 'INT (1 - 5 sao)', '#fbbf24'),
            ('', 'comment', 'TEXT (Nhận xét chi tiết)', '#cbd5e1'),
            ('', 'fit_feedback', 'ENUM(RUNS_SMALL, TRUE_SIZE, LARGE)', '#f472b6'),
            ('AI', 'sentiment_label', 'ENUM(POSITIVE, NEGATIVE, NEUTRAL)', '#38bdf8'),
            ('AI', 'sentiment_score', 'FLOAT (Độ tin cậy cảm xúc)', '#38bdf8'),
            ('', 'helpful_count', 'INT (Lượt vote hữu ích)', '#cbd5e1'),
            ('', 'is_pinned', 'BOOLEAN (Ghim đánh giá hay)', '#4ade80'),
            ('', 'is_visible', 'BOOLEAN', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'review_images': {
        'x': 2950, 'y': 850, 'w': 600, 'domain': 'REVIEW',
        'title': 'REVIEW_IMAGES (Ảnh thực tế phản hồi)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'review_id', 'UUID -> reviews.id', '#fb7185'),
            ('', 'image_url', 'VARCHAR(255)', '#cbd5e1')
        ]
    },
    'review_replies': {
        'x': 2950, 'y': 1130, 'w': 600, 'domain': 'REVIEW',
        'title': 'REVIEW_REPLIES (Shop / Admin phản hồi)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'review_id', 'UUID -> reviews.id', '#fb7185'),
            ('FK', 'staff_id', 'UUID -> users.id', '#60a5fa'),
            ('', 'reply_text', 'TEXT (Lời cảm ơn / giải đáp)', '#cbd5e1'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'review_helpful_votes': {
        'x': 2950, 'y': 1490, 'w': 600, 'domain': 'REVIEW',
        'title': 'REVIEW_HELPFUL_VOTES (Vote hữu ích)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'review_id', 'UUID -> reviews.id', '#fb7185'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    },
    'product_comments': {
        'x': 2950, 'y': 1850, 'w': 600, 'domain': 'COMMENT',
        'title': 'PRODUCT_COMMENTS (Bình luận & Hỏi đáp Q&A)',
        'fields': [
            ('PK', 'id', 'UUID', '#fbbf24'),
            ('FK', 'product_id', 'UUID -> products.id', '#34d399'),
            ('FK', 'user_id', 'UUID -> users.id', '#60a5fa'),
            ('FK', 'parent_id', 'UUID -> product_comments.id', '#38bdf8'),
            ('', 'content', 'TEXT (Hỏi về size, đế, bảo quản...)', '#cbd5e1'),
            ('', 'is_staff_reply', 'BOOLEAN (Shop trả lời)', '#38bdf8'),
            ('', 'is_pinned', 'BOOLEAN (Ghim câu hỏi thường gặp)', '#4ade80'),
            ('', 'is_visible', 'BOOLEAN', '#4ade80'),
            ('', 'created_at', 'TIMESTAMP', '#94a3b8')
        ]
    }
}

ROW_HEIGHT = 32
HEADER_HEIGHT = 44

# Draw tables
for tbl_name, tbl in tables.items():
    x, y, w = tbl['x'], tbl['y'], tbl['w']
    fields = tbl['fields']
    h = HEADER_HEIGHT + len(fields) * ROW_HEIGHT + 14
    theme = THEMES[tbl['domain']]
    
    # Outer Card Background & Shadow
    shadow = FancyBboxPatch((x+4, y+4), w, h, boxstyle="round,pad=0,rounding_size=10",
                            facecolor='#020617', edgecolor='none', alpha=0.6, zorder=2)
    ax.add_patch(shadow)
    
    card = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=10",
                          facecolor=theme['bg'], edgecolor=theme['border'], linewidth=1.8, zorder=3)
    ax.add_patch(card)
    
    # Header Background
    header = FancyBboxPatch((x, y), w, HEADER_HEIGHT, boxstyle="round,pad=0,rounding_size=10",
                            facecolor=theme['header'], edgecolor='none', zorder=4)
    ax.add_patch(header)
    header_sq = patches.Rectangle((x, y + HEADER_HEIGHT - 12), w, 12,
                                  facecolor=theme['header'], edgecolor='none', zorder=4)
    ax.add_patch(header_sq)
    
    # Table Title
    ax.text(x + 16, y + HEADER_HEIGHT/2, tbl['title'], fontsize=12, fontweight='bold',
            color='#ffffff', va='center', zorder=5, fontfamily='sans-serif')
    
    # Fields
    for idx, (badge, fname, ftype, col) in enumerate(fields):
        fy = y + HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT/2 + 6
        
        # Row hover/stripe effect
        if idx % 2 == 1:
            stripe = patches.Rectangle((x+1, fy - ROW_HEIGHT/2), w-2, ROW_HEIGHT,
                                       facecolor='#1e293b', edgecolor='none', alpha=0.4, zorder=4)
            ax.add_patch(stripe)
            
        # Key Badge
        if badge:
            badge_color = '#d97706' if badge == 'PK' else ('#2563eb' if badge == 'FK' else ('#0284c7' if badge == 'UK' else '#7c3aed'))
            b_patch = FancyBboxPatch((x + 12, fy - 9), 32, 18, boxstyle="round,pad=0,rounding_size=4",
                                     facecolor=badge_color, edgecolor='none', zorder=5)
            ax.add_patch(b_patch)
            ax.text(x + 28, fy, badge, fontsize=8.5, fontweight='bold', color='#ffffff',
                    ha='center', va='center', zorder=6, fontfamily='monospace')
            
        # Field Name
        ax.text(x + 54, fy, fname, fontsize=10.2, fontweight='600', color='#f1f5f9',
                va='center', zorder=5, fontfamily='monospace')
        
        # Field Type
        ax.text(x + w - 16, fy, ftype, fontsize=9.0, color=col,
                ha='right', va='center', zorder=5, fontfamily='monospace')

# Relationships lines (Source to Target)
RELATIONSHIPS = [
    # RBAC relations
    ('roles', 'role_permissions', '#818cf8', '1 : N'),
    ('permissions', 'role_permissions', '#818cf8', '1 : N'),
    ('roles', 'users', '#818cf8', '1 : N (Gán vai trò)'),
    
    # Users relations
    ('users', 'user_addresses', '#3b82f6', '1 : N'),
    ('users', 'notifications', '#3b82f6', '1 : N'),
    ('users', 'wishlists', '#3b82f6', '1 : N'),
    ('users', 'cart_items', '#3b82f6', '1 : N'),
    ('users', 'orders', '#3b82f6', '1 : N'),
    ('users', 'reviews', '#3b82f6', '1 : N'),
    ('users', 'review_replies', '#3b82f6', '1 : N (Staff reply)'),
    ('users', 'review_helpful_votes', '#3b82f6', '1 : N'),
    ('users', 'product_comments', '#3b82f6', '1 : N'),
    ('users', 'user_recommendations', '#3b82f6', '1 : N'),
    
    # Catalog to Products
    ('categories', 'products', '#10b981', '1 : N'),
    ('brands', 'products', '#10b981', '1 : N'),
    ('suppliers', 'products', '#10b981', '1 : N'),
    
    # Product relations
    ('products', 'product_variants', '#10b981', '1 : N (Size/Color)'),
    ('products', 'product_images', '#10b981', '1 : N'),
    ('products', 'wishlists', '#10b981', '1 : N'),
    ('products', 'reviews', '#10b981', '1 : N'),
    ('products', 'product_comments', '#10b981', '1 : N'),
    ('products', 'user_recommendations', '#10b981', '1 : N'),
    
    # Variants to Items & Inventory
    ('product_variants', 'inventory_transactions', '#8b5cf6', '1 : N'),
    ('product_variants', 'cart_items', '#8b5cf6', '1 : N'),
    ('product_variants', 'order_items', '#8b5cf6', '1 : N'),
    
    # Orders & Items
    ('vouchers', 'orders', '#f59e0b', '0..1 : N'),
    ('orders', 'order_items', '#f59e0b', '1 : N'),
    ('order_items', 'reviews', '#f43f5e', '1 : 1 (Verified Purchase)'),
    
    # Reviews ecosystem
    ('reviews', 'review_images', '#f43f5e', '1 : N'),
    ('reviews', 'review_replies', '#f43f5e', '1 : N (Shop phản hồi)'),
    ('reviews', 'review_helpful_votes', '#f43f5e', '1 : N (Vote hữu ích)')
]

# Draw connectors
for src, dst, color, label in RELATIONSHIPS:
    t1 = tables[src]
    t2 = tables[dst]
    
    x1 = t1['x'] + t1['w']
    y1 = t1['y'] + 35
    x2 = t2['x']
    y2 = t2['y'] + 35
    
    # If target is to the left
    if x2 <= t1['x']:
        x1 = t1['x']
        x2 = t2['x'] + t2['w']
        
    # Draw arrow path
    arrow = patches.FancyArrowPatch(
        (x1, y1), (x2, y2),
        connectionstyle=f"arc3,rad={0.08 if y2 > y1 else -0.08}",
        arrowstyle="-|>",
        mutation_scale=13,
        color=color,
        linewidth=1.6,
        alpha=0.65,
        zorder=1
    )
    ax.add_patch(arrow)

# Save high-res PNG image
out_png = "c:/Users/vuvie/Documents/CNPM/ShoesStoreApp/diagrams/erd_diagram.png"
plt.tight_layout()
plt.savefig(out_png, dpi=180, facecolor='#0b0f19', edgecolor='none', bbox_inches='tight')
plt.close()

print(f"Updated ERD Diagram with RBAC generated successfully: {out_png}")
