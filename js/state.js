export const state = {
  currentUser: null,
  profile: null,
  stock: [],
  history: [],
  employees: [],
  selectedEmployeeId: null,

  quickStockMode: "in",
  quickStockName: "",

  filters: {
    stockQuery: "",
    stockSort: "name_asc",
    stockPageSize: 25,
    stockPage: 1,

    empQuery: "",
    empStatus: "all",
  },
};
