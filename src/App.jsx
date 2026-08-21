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

const EMPTY_LOGIN_FORM = {
  username: "",
  password: "",
};

function App() {

  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loginForm, setLoginForm] =
    useState(EMPTY_LOGIN_FORM);

  const [loginLoading, setLoginLoading] =
    useState(false);

  const [loginError, setLoginError] =
    useState("");

  const [products, setProducts] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [editingId, setEditingId] =
    useState(null);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const ROLE_PERMISSIONS = {
    admin: [
      "product.read",
      "product.create",
      "product.update",
      "product.delete",
    ],

    manager: [
      "product.read",
      "product.create",
      "product.update",
    ],

    staff: [
      "product.read",
      "product.create",
    ],

    viewer: [
      "product.read",
    ],
  };

  const hasPermission = (permission) =>
    Boolean(
      user &&
        (ROLE_PERMISSIONS[user.role] || []).includes(
          permission
        )
    );

  const canReadProducts =
    hasPermission("product.read");

  const canCreateProducts =
    hasPermission("product.create");

  const canUpdateProducts =
    hasPermission("product.update");

  const canDeleteProducts =
    hasPermission("product.delete");

  const checkAuth = async () => {
    try {
      setAuthLoading(true);

      const response = await fetch(
        "/api/me",
        {
          credentials: "include",
        }
      );

      if (response.status === 401) {
        setUser(null);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể kiểm tra đăng nhập."
        );
      }

      setUser(result.user);
    } catch (err) {
      console.error(
        "Check auth error:",
        err
      );

      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginChange = (event) => {
    const { name, value } =
      event.target;

    setLoginForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginError("");

    if (!loginForm.username.trim()) {
      setLoginError(
        "Vui lòng nhập tên đăng nhập."
      );
      return;
    }

    if (!loginForm.password) {
      setLoginError(
        "Vui lòng nhập mật khẩu."
      );
      return;
    }

    try {
      setLoginLoading(true);

      const response = await fetch(
        "/api/login",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            username:
              loginForm.username.trim(),

            password:
              loginForm.password,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Đăng nhập thất bại."
        );
      }

      setUser(result.user);

      setLoginForm(
        EMPTY_LOGIN_FORM
      );

      setError("");
      setSuccess("");
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setLoginError(
        err.message ||
          "Không thể đăng nhập."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(
        "/api/logout",
        {
          method: "POST",

          credentials: "include",
        }
      );
    } catch (err) {
      console.error(
        "Logout error:",
        err
      );
    } finally {
      setUser(null);
      setProducts([]);
      setForm(EMPTY_FORM);
      setEditingId(null);

      setError("");
      setSuccess("");

      setCurrentPage(1);

      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    }
  };

  const handleUnauthorized = () => {
    setUser(null);

    setProducts([]);

    setError("");
    setSuccess("");

    setLoginError(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    );
  };

  const loadProducts = async (
    page = 1
  ) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/products?page=${page}&limit=10`,
        {
          credentials: "include",
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error ||
            "Tài khoản không có quyền xem danh sách sản phẩm."
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `HTTP ${response.status}`
        );
      }

      setProducts(
        result.data || []
      );

      setPagination(
        result.pagination || {
          page,
          limit: 10,
          total:
            result.data?.length || 0,
          totalPages: 1,
        }
      );

      setCurrentPage(page);
    } catch (err) {
      console.error(
        "Load products error:",
        err
      );

      setError(
        err.message ||
          "Không thể tải danh sách sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProducts(1);
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (product) => {
    if (!canUpdateProducts) {
      setError(
        "Bạn không có quyền chỉnh sửa sản phẩm."
      );
      return;
    }

    setError("");
    setSuccess("");

    setEditingId(product.id);

    setForm({
      sku: product.sku || "",
      name: product.name || "",
      category:
        product.category || "",
      quantity:
        product.quantity ?? "",
      unit:
        product.unit || "cái",
      price:
        product.price ?? "",
      description:
        product.description || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    if (!canDeleteProducts) {
      setError(
        "Bạn không có quyền xóa sản phẩm."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Bạn có chắc chắn muốn xóa sản phẩm này không?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/products/${id}`,
        {
          method: "DELETE",

          credentials: "include",
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `HTTP ${response.status}`
        );
      }

      setSuccess(
        "Xóa sản phẩm thành công."
      );

      let pageToLoad =
        currentPage;

      if (
        products.length === 1 &&
        currentPage > 1
      ) {
        pageToLoad =
          currentPage - 1;
      }

      await loadProducts(
        pageToLoad
      );
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      setError(
        err.message ||
          "Không thể xóa sản phẩm."
      );
    }
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const requiredPermission = editingId
      ? "product.update"
      : "product.create";

    if (!hasPermission(requiredPermission)) {
      setError(
        "Bạn không có quyền thực hiện thao tác này."
      );
      return;
    }

    setError("");
    setSuccess("");

    if (!form.sku.trim()) {
      setError(
        "Vui lòng nhập SKU."
      );
      return;
    }

    if (!form.name.trim()) {
      setError(
        "Vui lòng nhập tên sản phẩm."
      );
      return;
    }

    if (!form.category.trim()) {
      setError(
        "Vui lòng nhập loại hàng."
      );
      return;
    }

    if (
      form.quantity === "" ||
      Number(form.quantity) < 0
    ) {
      setError(
        "Số lượng không hợp lệ."
      );
      return;
    }

    if (!form.unit) {
      setError(
        "Vui lòng chọn đơn vị tính."
      );
      return;
    }

    if (
      form.price === "" ||
      Number(form.price) < 0
    ) {
      setError(
        "Đơn giá không hợp lệ."
      );
      return;
    }

    const payload = {
      sku: form.sku.trim(),

      name: form.name.trim(),

      category:
        form.category.trim(),

      quantity:
        Number(form.quantity),

      unit: form.unit,

      price:
        Number(form.price),

      description:
        form.description.trim(),
    };

    try {
      setSaving(true);

      let response;

      if (editingId) {
        response = await fetch(
          `/api/products/${editingId}`,
          {
            method: "PUT",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );
      } else {
        response = await fetch(
          "/api/products",
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `HTTP ${response.status}`
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

      await loadProducts(
        currentPage
      );
    } catch (err) {
      console.error(
        "Save product error:",
        err
      );

      setError(
        err.message ||
          "Không thể lưu sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (
    page
  ) => {
    if (page < 1) {
      return;
    }

    if (
      pagination.totalPages > 0 &&
      page >
        pagination.totalPages
    ) {
      return;
    }

    loadProducts(page);
  };

  const formatPrice = (
    price
  ) => {
    const number =
      Number(price);

    if (
      Number.isNaN(number)
    ) {
      return "0";
    }

    return new Intl.NumberFormat(
      "vi-VN"
    ).format(number);
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <div className="auth-spinner" />

          <p>
            Đang kiểm tra phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="auth-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">
              K
            </div>

            <div>
              <h1>
                Quản lý kho hàng
              </h1>

              <p>
                Hệ thống quản lý sản phẩm
                và tồn kho
              </p>
            </div>
          </div>

          <div className="login-divider" />

          <div className="login-heading">
            <h2>Đăng nhập</h2>

            <p>
              Nhập thông tin tài khoản
              để tiếp tục
            </p>
          </div>

          {loginError && (
            <div className="alert alert-error">
              {loginError}
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleLogin}
          >
            <div className="form-group">
              <label
                htmlFor="username"
              >
                Tên đăng nhập
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={
                  loginForm.username
                }
                onChange={
                  handleLoginChange
                }
                placeholder="Nhập tên đăng nhập"
                disabled={
                  loginLoading
                }
                autoFocus
              />
            </div>

            <div className="form-group">
              <label
                htmlFor="password"
              >
                Mật khẩu
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={
                  loginForm.password
                }
                onChange={
                  handleLoginChange
                }
                placeholder="Nhập mật khẩu"
                disabled={
                  loginLoading
                }
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-button"
              disabled={
                loginLoading
              }
            >
              {loginLoading
                ? "Đang đăng nhập..."
                : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content header-main">
          <div>
            <h1>
              Quản lý kho hàng
            </h1>

            <p>
              Quản lý sản phẩm và
              số lượng tồn kho
            </p>
          </div>

          <div className="user-area">
            <div className="user-info">
              <div className="user-avatar">
                {user.username
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="user-details">
                <strong>
                  {user.username}
                </strong>

                <span>
                  {{
                    admin: "Quản trị viên",
                    manager: "Quản lý kho",
                    staff: "Nhân viên kho",
                    viewer: "Chỉ xem",
                  }[user.role] || user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary logout-button"
              onClick={
                handleLogout
              }
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="container">
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

        {}

        {canCreateProducts || canUpdateProducts ? (
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
                  onClick={
                    resetForm
                  }
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="sku">
                    SKU{" "}
                    <span>*</span>
                  </label>

                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={
                      form.sku
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="VD: KB-001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">
                    Tên sản phẩm{" "}
                    <span>*</span>
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={
                      form.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="VD: Bàn phím cơ"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">
                    Loại hàng{" "}
                    <span>*</span>
                  </label>

                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="VD: Thiết bị máy tính"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">
                    Số lượng{" "}
                    <span>*</span>
                  </label>

                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={
                      form.quantity
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">
                    Đơn vị tính{" "}
                    <span>*</span>
                  </label>

                  <select
                    id="unit"
                    name="unit"
                    value={
                      form.unit
                    }
                    onChange={
                      handleChange
                    }
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

                <div className="form-group">
                  <label htmlFor="price">
                    Đơn giá{" "}
                    <span>*</span>
                  </label>

                  <div className="price-input">
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.price
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="0"
                    />

                    <span>
                      VND
                    </span>
                  </div>
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="description">
                    Mô tả
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Nhập mô tả sản phẩm..."
                  />
                </div>
              </div>

              <div className="form-actions">
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={
                      resetForm
                    }
                    disabled={
                      saving
                    }
                  >
                    Hủy
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    saving
                  }
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
        ) : null}

        {}

        <section className="card">
          <div className="card-header">
            <div>
              <h2>
                Danh sách hàng hóa
              </h2>

              <p>
                {pagination.total} sản phẩm trong kho
                {" · "}
                {canDeleteProducts
                  ? "Toàn quyền quản lý"
                  : canUpdateProducts
                  ? "Có thể thêm và chỉnh sửa"
                  : canCreateProducts
                  ? "Có thể thêm sản phẩm"
                  : "Chỉ xem dữ liệu"}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                loadProducts(
                  currentPage
                )
              }
              disabled={
                loading
              }
            >
              {loading
                ? "Đang tải..."
                : "↻ Làm mới"}
            </button>
          </div>

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

                  {(canUpdateProducts || canDeleteProducts) && (
                    <th>
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        canUpdateProducts || canDeleteProducts
                          ? 9
                          : 8
                      }
                      className="empty-state"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : products.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        canUpdateProducts || canDeleteProducts
                          ? 9
                          : 8
                      }
                      className="empty-state"
                    >
                      Chưa có sản phẩm.
                    </td>
                  </tr>
                ) : (
                  products.map(
                    (product) => (
                      <tr
                        key={
                          product.id
                        }
                      >
                        <td>
                          {product.id}
                        </td>

                        <td>
                          <strong>
                            {
                              product.sku
                            }
                          </strong>
                        </td>

                        <td>
                          {product.name}
                        </td>

                        <td>
                          {
                            product.category
                          }
                        </td>

                        <td className="quantity">
                          {
                            product.quantity
                          }
                        </td>

                        <td>
                          {product.unit}
                        </td>

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

                        {(canUpdateProducts || canDeleteProducts) && (
                          <td>
                            <div className="action-buttons">
                              {canUpdateProducts && (
                                <button
                                  type="button"
                                  className="btn btn-edit"
                                  onClick={() =>
                                    handleEdit(product)
                                  }
                                >
                                  Sửa
                                </button>
                              )}

                              {canDeleteProducts && (
                                <button
                                  type="button"
                                  className="btn btn-delete"
                                  onClick={() =>
                                    handleDelete(product.id)
                                  }
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages >
            0 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">
                Trang{" "}
                <strong>
                  {currentPage}
                </strong>{" "}
                /{" "}
                <strong>
                  {
                    pagination.totalPages
                  }
                </strong>

                <span className="separator">
                  ·
                </span>

                Tổng{" "}
                <strong>
                  {
                    pagination.total
                  }
                </strong>{" "}
                sản phẩm
              </div>

              <div className="pagination">
                <button
                  type="button"
                  disabled={
                    currentPage <=
                      1 ||
                    loading
                  }
                  onClick={() =>
                    handlePageChange(
                      currentPage -
                        1
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
                  (_, index) =>
                    index + 1
                ).map((page) => (
                  <button
                    type="button"
                    key={page}
                    className={
                      page ===
                      currentPage
                        ? "active"
                        : ""
                    }
                    disabled={
                      loading
                    }
                    onClick={() =>
                      handlePageChange(
                        page
                      )
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
                      currentPage +
                        1
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
