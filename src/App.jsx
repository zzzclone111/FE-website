import { useEffect, useState } from "react";
import "./App.css";

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "",
  quantity: "",
  unit: "cái",
  price: "",
  description: "",
};

function App() {
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // =========================
  // LOAD PRODUCTS
  // =========================

  const loadProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/products?page=${page}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      setProducts(result.data || []);

      setPagination(
        result.pagination || {
          page,
          limit: 10,
          total: result.data?.length || 0,
          totalPages: 1,
        }
      );

      setCurrentPage(page);
    } catch (err) {
      console.error("Load products error:", err);

      setError("Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadProducts(1);
  }, []);

  // =========================
  // FORM CHANGE
  // =========================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  // =========================
  // EDIT PRODUCT
  // =========================

  const handleEdit = (product) => {
    setError("");
    setSuccess("");

    setEditingId(product.id);

    setForm({
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      quantity: product.quantity ?? "",
      unit: product.unit || "cái",
      price: product.price ?? "",
      description: product.description || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE PRODUCT
  // =========================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa sản phẩm này không?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP ${response.status}`
        );
      }

      setSuccess("Xóa sản phẩm thành công.");

      /*
       * Nếu xóa sản phẩm cuối cùng của trang hiện tại,
       * chuyển về trang trước.
       */
      let pageToLoad = currentPage;

      if (
        products.length === 1 &&
        currentPage > 1
      ) {
        pageToLoad = currentPage - 1;
      }

      await loadProducts(pageToLoad);
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.message || "Không thể xóa sản phẩm."
      );
    }
  };

  // =========================
  // SUBMIT FORM
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Validate
    if (!form.sku.trim()) {
      setError("Vui lòng nhập SKU.");
      return;
    }

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!form.category.trim()) {
      setError("Vui lòng nhập loại hàng.");
      return;
    }

    if (
      form.quantity === "" ||
      Number(form.quantity) < 0
    ) {
      setError("Số lượng không hợp lệ.");
      return;
    }

    if (!form.unit) {
      setError("Vui lòng chọn đơn vị tính.");
      return;
    }

    if (
      form.price === "" ||
      Number(form.price) < 0
    ) {
      setError("Đơn giá không hợp lệ.");
      return;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      quantity: Number(form.quantity),
      unit: form.unit,
      price: Number(form.price),
      description: form.description.trim(),
    };

    try {
      setSaving(true);

      let response;

      if (editingId) {
        // =========================
        // UPDATE
        // =========================

        response = await fetch(
          `/api/products/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // =========================
        // CREATE
        // =========================

        response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP ${response.status}`
        );
      }

      if (editingId) {
        setSuccess(
          "Cập nhật sản phẩm thành công."
        );
      } else {
        setSuccess(
          "Thêm sản phẩm thành công."
        );
      }

      resetForm();

      /*
       * Sau khi thêm/sửa:
       * tải lại trang hiện tại.
       */
      await loadProducts(currentPage);
    } catch (err) {
      console.error("Save product error:", err);

      setError(
        err.message ||
          "Không thể lưu sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // PAGE CHANGE
  // =========================

  const handlePageChange = (page) => {
    if (page < 1) {
      return;
    }

    if (
      pagination.totalPages > 0 &&
      page > pagination.totalPages
    ) {
      return;
    }

    loadProducts(page);
  };

  // =========================
  // FORMAT PRICE
  // =========================

  const formatPrice = (price) => {
    const number = Number(price);

    if (Number.isNaN(number)) {
      return "0";
    }

    return new Intl.NumberFormat("vi-VN").format(
      number
    );
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="app">
      {/* =========================
          HEADER
      ========================= */}

      <header className="header">
        <div className="header-content">
          <h1>Quản lý kho hàng</h1>

          <p>
            Quản lý sản phẩm và số lượng tồn kho
          </p>
        </div>
      </header>

      <main className="container">
        {/* =========================
            ALERTS
        ========================= */}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* =========================
            PRODUCT FORM
        ========================= */}

        <section className="card form-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId
                  ? "Chỉnh sửa sản phẩm"
                  : "Thêm sản phẩm"}
              </h2>

              <p>
                {editingId
                  ? "Cập nhật thông tin sản phẩm"
                  : "Nhập thông tin sản phẩm mới"}
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* SKU */}

              <div className="form-group">
                <label htmlFor="sku">
                  SKU <span>*</span>
                </label>

                <input
                  id="sku"
                  name="sku"
                  type="text"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="VD: KB-001"
                />
              </div>

              {/* NAME */}

              <div className="form-group">
                <label htmlFor="name">
                  Tên sản phẩm <span>*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="VD: Bàn phím cơ"
                />
              </div>

              {/* CATEGORY */}

              <div className="form-group">
                <label htmlFor="category">
                  Loại hàng <span>*</span>
                </label>

                <input
                  id="category"
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="VD: Thiết bị máy tính"
                />
              </div>

              {/* QUANTITY */}

              <div className="form-group">
                <label htmlFor="quantity">
                  Số lượng <span>*</span>
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              {/* UNIT */}

              <div className="form-group">
                <label htmlFor="unit">
                  Đơn vị tính <span>*</span>
                </label>

                <select
                  id="unit"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                >
                  <option value="cái">
                    Cái
                  </option>

                  <option value="hộp">
                    Hộp
                  </option>

                  <option value="bộ">
                    Bộ
                  </option>

                  <option value="chiếc">
                    Chiếc
                  </option>

                  <option value="kg">
                    Kg
                  </option>

                  <option value="lít">
                    Lít
                  </option>
                </select>
              </div>

              {/* PRICE */}

              <div className="form-group">
                <label htmlFor="price">
                  Đơn giá <span>*</span>
                </label>

                <div className="price-input">
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0"
                  />

                  <span>VND</span>
                </div>
              </div>

              {/* DESCRIPTION */}

              <div className="form-group form-group-full">
                <label htmlFor="description">
                  Mô tả
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả sản phẩm..."
                />
              </div>
            </div>

            {/* FORM BUTTONS */}

            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Hủy
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                  ? "Lưu thay đổi"
                  : "Thêm sản phẩm"}
              </button>
            </div>
          </form>
        </section>

        {/* =========================
            PRODUCT LIST
        ========================= */}

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Danh sách hàng hóa</h2>

              <p>
                {pagination.total} sản phẩm
                trong kho
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                loadProducts(currentPage)
              }
              disabled={loading}
            >
              {loading
                ? "Đang tải..."
                : "↻ Làm mới"}
            </button>
          </div>

          {/* TABLE */}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SKU</th>
                  <th>Tên hàng</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Đơn vị</th>
                  <th>Đơn giá</th>
                  <th>Mô tả</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-state"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-state"
                    >
                      Chưa có sản phẩm.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>

                      <td>
                        <strong>
                          {product.sku}
                        </strong>
                      </td>

                      <td>{product.name}</td>

                      <td>{product.category}</td>

                      <td className="quantity">
                        {product.quantity}
                      </td>

                      <td>{product.unit}</td>

                      <td className="price">
                        {formatPrice(
                          product.price
                        )}{" "}
                        ₫
                      </td>

                      <td className="description">
                        {product.description ||
                          "—"}
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn btn-edit"
                            onClick={() =>
                              handleEdit(product)
                            }
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            className="btn btn-delete"
                            onClick={() =>
                              handleDelete(
                                product.id
                              )
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =========================
              PAGINATION
          ========================= */}

          {pagination.totalPages > 0 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">
                Trang{" "}
                <strong>
                  {currentPage}
                </strong>{" "}
                /{" "}
                <strong>
                  {pagination.totalPages}
                </strong>

                <span className="separator">
                  ·
                </span>

                Tổng{" "}
                <strong>
                  {pagination.total}
                </strong>{" "}
                sản phẩm
              </div>

              <div className="pagination">
                <button
                  type="button"
                  disabled={
                    currentPage <= 1 ||
                    loading
                  }
                  onClick={() =>
                    handlePageChange(
                      currentPage - 1
                    )
                  }
                >
                  ← Trước
                </button>

                {Array.from(
                  {
                    length:
                      pagination.totalPages,
                  },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    type="button"
                    key={page}
                    className={
                      page === currentPage
                        ? "active"
                        : ""
                    }
                    disabled={loading}
                    onClick={() =>
                      handlePageChange(page)
                    }
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={
                    currentPage >=
                      pagination.totalPages ||
                    loading
                  }
                  onClick={() =>
                    handlePageChange(
                      currentPage + 1
                    )
                  }
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
