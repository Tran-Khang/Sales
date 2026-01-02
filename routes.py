from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from models import db, Product, Sale, Customer, SaleItem, InventoryLog
from datetime import datetime, timedelta
import random
import string
from flask_socketio import socketio
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def dashboard():
    # Get today's sales
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    today_sales = Sale.query.filter(
        Sale.sale_date >= today_start,
        Sale.sale_date <= today_end
    ).all()
    
    total_today_sales = sum(sale.total_amount for sale in today_sales)
    total_today_transactions = len(today_sales)
    
    # Get low stock products
    low_stock_products = Product.query.filter(Product.stock_quantity <= Product.min_stock).all()
    
    # Get recent sales
    recent_sales = Sale.query.order_by(Sale.sale_date.desc()).limit(10).all()
    
    # Get sales data for chart (last 7 days)
    last_7_days = []
    sales_data = []
    for i in range(6, -1, -1):
        day = datetime.now().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_sales = Sale.query.filter(
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end
        ).all()
        
        day_total = sum(sale.total_amount for sale in day_sales)
        last_7_days.append(day.strftime('%a'))
        sales_data.append(float(day_total))
    
    return render_template('dashboard.html',
                          total_sales=total_today_sales,
                          total_transactions=total_today_transactions,
                          low_stock_count=len(low_stock_products),
                          recent_sales=recent_sales,
                          last_7_days=last_7_days,
                          sales_data=sales_data)

@main_bp.route('/products')
@login_required
def products():
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    
    query = Product.query
    
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))
    
    if category:
        query = query.filter(Product.category == category)
    
    products = query.order_by(Product.name).all()
    categories = db.session.query(Product.category).distinct().all()
    categories = [c[0] for c in categories if c[0]]
    
    return render_template('products.html', products=products, categories=categories, search=search, category=category)

@main_bp.route('/product/add', methods=['GET', 'POST'])
@login_required
def add_product():
    if request.method == 'POST':
        # Generate SKU if not provided
        sku = request.form.get('sku')
        if not sku:
            sku = 'SKU-' + ''.join(random.choices(string.digits, k=8))
        
        product = Product(
            name=request.form.get('name'),
            description=request.form.get('description'),
            sku=sku,
            category=request.form.get('category'),
            price=float(request.form.get('price', 0)),
            cost_price=float(request.form.get('cost_price', 0)),
            stock_quantity=int(request.form.get('stock_quantity', 0)),
            min_stock=int(request.form.get('min_stock', 10)),
            image_url=request.form.get('image_url')
        )
        
        db.session.add(product)
        db.session.commit()
        
        flash('Sản phẩm đã được thêm thành công!', 'success')
        return redirect(url_for('main.products'))
    
    return render_template('add_product.html')

@main_bp.route('/product/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_product(id):
    product = Product.query.get_or_404(id)
    
    if request.method == 'POST':
        product.name = request.form.get('name')
        product.description = request.form.get('description')
        product.category = request.form.get('category')
        product.price = float(request.form.get('price', 0))
        product.cost_price = float(request.form.get('cost_price', 0))
        product.min_stock = int(request.form.get('min_stock', 10))
        product.image_url = request.form.get('image_url')
        product.updated_at = datetime.utcnow()
        
        db.session.commit()
        flash('Sản phẩm đã được cập nhật!', 'success')
        return redirect(url_for('main.products'))
    
    return render_template('edit_product.html', product=product)

@main_bp.route('/product/delete/<int:id>')
@login_required
def delete_product(id):
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    flash('Sản phẩm đã được xóa!', 'success')
    return redirect(url_for('main.products'))

@main_bp.route('/sales')
@login_required
def sales():
    search = request.args.get('search', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    
    query = Sale.query
    
    if search:
        query = query.filter(Sale.sale_code.ilike(f'%{search}%'))
    
    if date_from:
        date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
        query = query.filter(Sale.sale_date >= date_from_obj)
    
    if date_to:
        date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
        query = query.filter(Sale.sale_date <= date_to_obj)
    
    sales = query.order_by(Sale.sale_date.desc()).all()
    
    return render_template('sales.html', sales=sales, search=search, date_from=date_from, date_to=date_to)

@main_bp.route('/sale/new', methods=['GET', 'POST'])
@login_required
def new_sale():
    if request.method == 'POST':
        # Create sale code
        sale_code = 'SALE-' + datetime.now().strftime('%Y%m%d') + '-' + ''.join(random.choices(string.digits, k=4))
        
        # Create sale
        sale = Sale(
            sale_code=sale_code,
            customer_id=request.form.get('customer_id'),
            user_id=current_user.id,
            total_amount=float(request.form.get('total_amount', 0)),
            discount=float(request.form.get('discount', 0)),
            tax=float(request.form.get('tax', 0)),
            payment_method=request.form.get('payment_method'),
            notes=request.form.get('notes')
        )
        
        db.session.add(sale)
        db.session.flush()  # Get sale ID
        
        # Add sale items
        items = json.loads(request.form.get('items', '[]'))
        for item in items:
            product_id = item['product_id']
            quantity = int(item['quantity'])
            unit_price = float(item['unit_price'])
            
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=quantity * unit_price
            )
            
            # Update product stock
            product = Product.query.get(product_id)
            if product:
                product.stock_quantity -= quantity
                
                # Log inventory change
                log = InventoryLog(
                    product_id=product_id,
                    change_type='stock_out',
                    quantity_change=-quantity,
                    previous_quantity=product.stock_quantity + quantity,
                    new_quantity=product.stock_quantity,
                    reason=f'Sale #{sale_code}',
                    reference=str(sale.id),
                    user_id=current_user.id
                )
                db.session.add(log)
            
            db.session.add(sale_item)
        
        db.session.commit()
        flash('Đơn hàng đã được tạo thành công!', 'success')
        return redirect(url_for('main.sale_detail', id=sale.id))
    
    products = Product.query.filter(Product.stock_quantity > 0).all()
    customers = Customer.query.all()
    return render_template('new_sale.html', products=products, customers=customers)

@main_bp.route('/sale/<int:id>')
@login_required
def sale_detail(id):
    sale = Sale.query.get_or_404(id)
    return render_template('sale_detail.html', sale=sale)

@main_bp.route('/sales/history')
@login_required
def sales_history():
    period = request.args.get('period', 'today')  # today, week, month, year, custom
    
    today = datetime.now().date()
    
    if period == 'today':
        start_date = today
        end_date = today
    elif period == 'week':
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif period == 'month':
        start_date = today.replace(day=1)
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    elif period == 'year':
        start_date = today.replace(month=1, day=1)
        end_date = today.replace(month=12, day=31)
    else:
        start_date = request.args.get('start_date', today)
        end_date = request.args.get('end_date', today)
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    sales = Sale.query.filter(
        Sale.sale_date >= start_datetime,
        Sale.sale_date <= end_datetime
    ).order_by(Sale.sale_date.desc()).all()
    
    # Calculate statistics
    total_sales = sum(sale.total_amount for sale in sales)
    total_items = sum(sum(item.quantity for item in sale.sale_items) for sale in sales)
    average_sale = total_sales / len(sales) if sales else 0
    
    return render_template('sales_history.html',
                          sales=sales,
                          period=period,
                          start_date=start_date,
                          end_date=end_date,
                          total_sales=total_sales,
                          total_items=total_items,
                          average_sale=average_sale,
                          total_transactions=len(sales))

@main_bp.route('/customers')
@login_required
def customers():
    search = request.args.get('search', '')
    
    query = Customer.query
    
    if search:
        query = query.filter(Customer.name.ilike(f'%{search}%'))
    
    customers = query.order_by(Customer.name).all()
    
    return render_template('customers.html', customers=customers, search=search)

@main_bp.route('/api/sale/<int:id>/cancel', methods=['POST'])
@login_required
def cancel_sale(id):
    sale = Sale.query.get_or_404(id)
    
    if sale.status == 'cancelled':
        return jsonify({'success': False, 'message': 'Đơn hàng đã bị hủy trước đó'}), 400
    
    # Restore product stock
    for item in sale.sale_items:
        product = Product.query.get(item.product_id)
        if product:
            product.stock_quantity += item.quantity
            
            # Log inventory change
            log = InventoryLog(
                product_id=product.id,
                change_type='return',
                quantity_change=item.quantity,
                previous_quantity=product.stock_quantity - item.quantity,
                new_quantity=product.stock_quantity,
                reason=f'Hủy đơn hàng #{sale.sale_code}',
                reference=str(sale.id),
                user_id=current_user.id
            )
            db.session.add(log)
    
    sale.status = 'cancelled'
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('sale_update', {
        'sale_code': sale.sale_code,
        'status': 'cancelled',
        'user': current_user.username
    })
    
    return jsonify({'success': True, 'message': 'Đơn hàng đã được hủy'})

@main_bp.route('/api/sale/<int:id>/complete', methods=['POST'])
@login_required
def complete_sale(id):
    sale = Sale.query.get_or_404(id)
    
    if sale.status == 'completed':
        return jsonify({'success': False, 'message': 'Đơn hàng đã hoàn thành trước đó'}), 400
    
    sale.status = 'completed'
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Đơn hàng đã được xác nhận hoàn thành'})

@main_bp.route('/api/inventory/adjust', methods=['POST'])
@login_required
def adjust_inventory():
    data = request.json
    product_id = data.get('product_id')
    change_type = data.get('type')  # increase, decrease, adjustment, return
    quantity = data.get('quantity', 0)
    reason = data.get('reason', '')
    
    product = Product.query.get_or_404(product_id)
    
    # Calculate new quantity
    previous_quantity = product.stock_quantity
    if change_type in ['increase', 'return']:
        new_quantity = previous_quantity + quantity
    elif change_type in ['decrease']:
        if previous_quantity < quantity:
            return jsonify({'success': False, 'message': 'Số lượng trong kho không đủ'}), 400
        new_quantity = previous_quantity - quantity
    else:  # adjustment
        new_quantity = quantity
    
    # Update product stock
    product.stock_quantity = new_quantity
    
    # Log inventory change
    log = InventoryLog(
        product_id=product_id,
        change_type=change_type,
        quantity_change=new_quantity - previous_quantity,
        previous_quantity=previous_quantity,
        new_quantity=new_quantity,
        reason=reason,
        user_id=current_user.id
    )
    db.session.add(log)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('inventory_update', {
        'product_id': product_id,
        'product_name': product.name,
        'sku': product.sku,
        'change': new_quantity - previous_quantity,
        'new_quantity': new_quantity,
        'previous_quantity': previous_quantity,
        'reason': reason,
        'user': current_user.username
    })
    
    # Emit low stock warning if applicable
    if new_quantity <= product.min_stock:
        socketio.emit('stock_update', {
            'type': 'low_stock',
            'product_id': product_id,
            'product_name': product.name,
            'quantity': new_quantity,
            'min_stock': product.min_stock
        })
    
    return jsonify({
        'success': True,
        'message': 'Đã cập nhật tồn kho thành công',
        'new_quantity': new_quantity
    })

@main_bp.route('/api/sales/export')
@login_required
def export_sales():
    # This would generate an Excel or CSV file
    # For now, return a simple JSON response
    search = request.args.get('search', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    
    # Build query (same as sales page)
    query = Sale.query
    
    if search:
        query = query.filter(Sale.sale_code.ilike(f'%{search}%'))
    
    if date_from:
        date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
        query = query.filter(Sale.sale_date >= date_from_obj)
    
    if date_to:
        date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
        query = query.filter(Sale.sale_date <= date_to_obj)
    
    sales = query.order_by(Sale.sale_date.desc()).all()
    
    # In a real implementation, you would generate an Excel/CSV file here
    # For now, return JSON
    sales_data = [{
        'sale_code': sale.sale_code,
        'customer': sale.customer.name if sale.customer else 'Khách lẻ',
        'date': sale.sale_date.strftime('%d/%m/%Y %H:%M'),
        'total_amount': float(sale.total_amount),
        'payment_method': sale.payment_method,
        'status': sale.status
    } for sale in sales]
    
    return jsonify({
        'filename': f'sales_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
        'data': sales_data,
        'count': len(sales_data)
    })

@main_bp.route('/api/reports/export/<report_type>')
@login_required
def export_report(report_type):
    # This would generate different reports based on type
    period = request.args.get('period', 'week')
    
    # In a real implementation, you would generate an Excel/CSV file
    # For now, return a simple response
    return jsonify({
        'success': True,
        'message': f'Báo cáo {report_type} đang được tạo',
        'filename': f'report_{report_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    })

@main_bp.route('/api/inventory/export')
@login_required
def export_inventory():
    products = Product.query.order_by(Product.name).all()
    
    # In a real implementation, generate Excel/CSV
    inventory_data = [{
        'name': p.name,
        'sku': p.sku,
        'category': p.category,
        'price': float(p.price),
        'stock': p.stock_quantity,
        'min_stock': p.min_stock,
        'status': 'Hết hàng' if p.stock_quantity == 0 else 
                  'Sắp hết' if p.stock_quantity <= p.min_stock else 'Đủ hàng',
        'value': float(p.stock_quantity * p.price)
    } for p in products]
    
    return jsonify({
        'filename': f'inventory_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
        'data': inventory_data,
        'total_products': len(products),
        'total_value': sum(p.stock_quantity * p.price for p in products)
    })

@main_bp.route('/customer/<int:id>')
@login_required
def customer_detail(id):
    customer = Customer.query.get_or_404(id)
    
    # Get customer statistics
    total_spent = sum(sale.total_amount for sale in customer.sales)
    avg_order_value = total_spent / len(customer.sales) if customer.sales else 0
    
    # Get recent sales
    recent_sales = customer.sales.order_by(Sale.sale_date.desc()).limit(10).all()
    
    return render_template('customer_detail.html',
                          customer=customer,
                          total_spent=total_spent,
                          avg_order_value=avg_order_value,
                          recent_sales=recent_sales)

