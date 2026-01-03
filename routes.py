from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from models import db, Product, Sale, Customer, SaleItem, InventoryLog
from datetime import datetime, timedelta
import random, string, json
from flask_socketio import SocketIO

main = Blueprint('main', __name__)
socketio = SocketIO()

# ===== DASHBOARD =====
@main.route('/')
@login_required
def dashboard():
    today = datetime.now().date()
    today_sales = Sale.query.filter(Sale.sale_date.between(
        datetime.combine(today, datetime.min.time()),
        datetime.combine(today, datetime.max.time())
    )).all()
    total_sales = sum(sale.total_amount for sale in today_sales)
    recent_sales = Sale.query.order_by(Sale.sale_date.desc()).limit(10).all()
    low_stock_count = Product.query.filter(Product.stock_quantity <= Product.min_stock).count()
    
    last_7_days = [(today - timedelta(days=i)).strftime('%a') for i in range(6, -1, -1)]
    sales_data = [sum(s.total_amount for s in Sale.query.filter(
                    Sale.sale_date.between(
                        datetime.combine(today - timedelta(days=i), datetime.min.time()),
                        datetime.combine(today - timedelta(days=i), datetime.max.time())
                    )).all()) for i in range(6, -1, -1)]
    
    return render_template('dashboard.html', total_sales=total_sales, total_transactions=len(today_sales),
                           low_stock_count=low_stock_count, recent_sales=recent_sales,
                           last_7_days=last_7_days, sales_data=sales_data)

# ===== PRODUCTS =====
@main.route('/products')
@login_required
def products():
    search, category = request.args.get('search', ''), request.args.get('category', '')
    query = Product.query
    if search: query = query.filter(Product.name.ilike(f'%{search}%'))
    if category: query = query.filter(Product.category == category)
    products = query.order_by(Product.name).all()
    categories = [c[0] for c in db.session.query(Product.category).distinct() if c[0]]
    return render_template('products.html', products=products, categories=categories, search=search, category=category)

def save_product(form, product=None):
    sku = form.get('sku') or 'SKU-' + ''.join(random.choices(string.digits, k=8))
    if not product: product = Product()
    product.name, product.description, product.category = form.get('name'), form.get('description'), form.get('category')
    product.sku, product.price, product.cost_price = sku, float(form.get('price',0)), float(form.get('cost_price',0))
    product.stock_quantity, product.min_stock, product.image_url = int(form.get('stock_quantity',0)), int(form.get('min_stock',10)), form.get('image_url')
    product.updated_at = datetime.utcnow()
    db.session.add(product)
    db.session.commit()
    return product

@main.route('/product/add', methods=['GET','POST'])
@login_required
def add_product(): 
    if request.method=='POST': 
        save_product(request.form)
        flash('Sản phẩm đã được thêm!', 'success')
        return redirect(url_for('main.products'))
    return render_template('add_product.html')

@main.route('/product/edit/<int:id>', methods=['GET','POST'])
@login_required
def edit_product(id):
    product = Product.query.get_or_404(id)
    if request.method=='POST':
        save_product(request.form, product)
        flash('Sản phẩm đã cập nhật!', 'success')
        return redirect(url_for('main.products'))
    return render_template('edit_product.html', product=product)

@main.route('/product/delete/<int:id>')
@login_required
def delete_product(id):
    db.session.delete(Product.query.get_or_404(id))
    db.session.commit()
    flash('Sản phẩm đã xóa!', 'success')
    return redirect(url_for('main.products'))

# ===== SALES =====
def filter_sales(search='', date_from='', date_to=''):
    query = Sale.query
    if search: query = query.filter(Sale.sale_code.ilike(f'%{search}%'))
    if date_from: query = query.filter(Sale.sale_date >= datetime.strptime(date_from,'%Y-%m-%d'))
    if date_to: query = query.filter(Sale.sale_date <= datetime.strptime(date_to,'%Y-%m-%d'))
    return query.order_by(Sale.sale_date.desc()).all()

@main.route('/sales')
@login_required
def sales():
    return render_template('sales.html', sales=filter_sales(request.args.get('search',''), request.args.get('date_from',''), request.args.get('date_to','')),
                           search=request.args.get('search',''), date_from=request.args.get('date_from',''), date_to=request.args.get('date_to',''))

@main.route('/sale/new', methods=['GET','POST'])
@login_required
def new_sale():
    if request.method=='POST':
        sale_code = 'SALE-'+datetime.now().strftime('%Y%m%d')+'-'+''.join(random.choices(string.digits,k=4))
        sale = Sale(sale_code=sale_code, customer_id=request.form.get('customer_id'), user_id=current_user.id,
                    total_amount=float(request.form.get('total_amount',0)), discount=float(request.form.get('discount',0)),
                    tax=float(request.form.get('tax',0)), payment_method=request.form.get('payment_method'), notes=request.form.get('notes'))
        db.session.add(sale); db.session.flush()
        for i in json.loads(request.form.get('items','[]')):
            product = Product.query.get(i['product_id'])
            if product:
                qty, price = int(i['quantity']), float(i['unit_price'])
                product.stock_quantity -= qty
                db.session.add(SaleItem(sale_id=sale.id, product_id=product.id, quantity=qty, unit_price=price, total_price=qty*price))
                db.session.add(InventoryLog(product_id=product.id, change_type='stock_out', quantity_change=-qty,
                                            previous_quantity=product.stock_quantity+qty, new_quantity=product.stock_quantity,
                                            reason=f'Sale #{sale_code}', reference=str(sale.id), user_id=current_user.id))
        db.session.commit()
        flash('Đơn hàng đã tạo!', 'success'); return redirect(url_for('main.sale_detail', id=sale.id))
    return render_template('new_sale.html', products=Product.query.filter(Product.stock_quantity>0).all(), customers=Customer.query.all())

@main.route('/sale/<int:id>')
@login_required
def sale_detail(id): return render_template('sale_detail.html', sale=Sale.query.get_or_404(id))

# ===== CUSTOMERS =====
@main.route('/customers')
@login_required
def customers(): 
    search=request.args.get('search','')
    query=Customer.query; 
    if search: query=query.filter(Customer.name.ilike(f'%{search}%'))
    return render_template('customers.html', customers=query.order_by(Customer.name).all(), search=search)

@main.route('/customer/<int:id>')
@login_required
def customer_detail(id):
    c=Customer.query.get_or_404(id)
    total=sum(s.total_amount for s in c.sales)
    avg=total/len(c.sales) if c.sales else 0
    return render_template('customer_detail.html', customer=c, total_spent=total, avg_order_value=avg,
                           recent_sales=c.sales.order_by(Sale.sale_date.desc()).limit(10).all())

# ===== INVENTORY & SALE ACTIONS =====
def emit_inventory(product, change, reason):
    socketio.emit('inventory_update', {'product_id':product.id,'product_name':product.name,'sku':product.sku,
                                       'change':change,'new_quantity':product.stock_quantity,
                                       'previous_quantity':product.stock_quantity-change,'reason':reason,'user':current_user.username})
    if product.stock_quantity <= product.min_stock:
        socketio.emit('stock_update', {'type':'low_stock','product_id':product.id,'product_name':product.name,
                                       'quantity':product.stock_quantity,'min_stock':product.min_stock})

@main.route('/api/inventory/adjust', methods=['POST'])
@login_required
def adjust_inventory():
    d=request.json; p=Product.query.get_or_404(d['product_id']); prev=p.stock_quantity
    new_qty=prev + d['quantity'] if d['type'] in ['increase','return'] else (prev-d['quantity'] if d['type']=='decrease' else d['quantity'])
    if new_qty<0: return jsonify({'success':False,'message':'Số lượng không đủ'}),400
    p.stock_quantity=new_qty
    db.session.add(InventoryLog(product_id=p.id, change_type=d['type'], quantity_change=new_qty-prev,
                                previous_quantity=prev, new_quantity=new_qty, reason=d.get('reason',''), user_id=current_user.id))
    db.session.commit(); emit_inventory(p,new_qty-prev,d.get('reason',''))
    return jsonify({'success':True,'message':'Cập nhật tồn kho thành công','new_quantity':new_qty})

@main.route('/api/sale/<int:id>/cancel', methods=['POST'])
@login_required
def cancel_sale(id):
    s=Sale.query.get_or_404(id)
    if s.status=='cancelled': return jsonify({'success':False,'message':'Đơn hàng đã hủy'}),400
    for i in s.sale_items:
        p=Product.query.get(i.product_id)
        if p: p.stock_quantity+=i.quantity; db.session.add(InventoryLog(product_id=p.id, change_type='return', quantity_change=i.quantity,
                previous_quantity=p.stock_quantity-i.quantity,new_quantity=p.stock_quantity, reason=f'Hủy đơn hàng #{s.sale_code}', reference=str(s.id), user_id=current_user.id))
    s.status='cancelled'; db.session.commit(); socketio.emit('sale_update',{'sale_code':s.sale_code,'status':'cancelled','user':current_user.username})
    return jsonify({'success':True,'message':'Đơn hàng đã hủy'})

@main.route('/api/sale/<int:id>/complete', methods=['POST'])
@login_required
def complete_sale(id):
    s=Sale.query.get_or_404(id)
    if s.status=='completed': return jsonify({'success':False,'message':'Đơn hàng đã hoàn thành'}),400
    s.status='completed'; db.session.commit(); return jsonify({'success':True,'message':'Đơn hàng đã hoàn thành'})

# ===== EXPORT =====
@main.route('/api/sales/export')
@login_required
def export_sales(): return jsonify({'filename':f'sales_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
                                    'data':[{'sale_code':s.sale_code,'customer':s.customer.name if s.customer else 'Khách lẻ',
                                             'date':s.sale_date.strftime('%d/%m/%Y %H:%M'),'total_amount':float(s.total_amount),
                                             'payment_method':s.payment_method,'status':s.status} for s in filter_sales(request.args.get('search',''),
                                                                                                                      request.args.get('date_from',''),
                                                                                                                      request.args.get('date_to',''))],
                                    'count':len(filter_sales(request.args.get('search',''),request.args.get('date_from',''),request.args.get('date_to','')))})

@main.route('/api/inventory/export')
@login_required
def export_inventory(): 
    plist=Product.query.order_by(Product.name).all()
    return jsonify({'filename':f'inventory_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
                    'data':[{'name':p.name,'sku':p.sku,'category':p.category,'price':float(p.price),
                             'stock':p.stock_quantity,'min_stock':p.min_stock,
                             'status':'Hết hàng' if p.stock_quantity==0 else 'Sắp hết' if p.stock_quantity<=p.min_stock else 'Đủ hàng',
                             'value':float(p.stock_quantity*p.price)} for p in plist],
                    'total_products':len(plist),'total_value':sum(p.stock_quantity*p.price for p in plist)})

@main.route('/api/reports/export/<report_type>')
@login_required
def export_report(report_type):
    return jsonify({'success':True,'message':f'Báo cáo {report_type} đang tạo','filename':f'report_{report_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'})

# ===== REPORTS PAGE =====
@main.route('/reports')
@login_required
def reports(): return render_template('reports.html')
