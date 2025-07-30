/**
 * Basic test to verify Jest setup is working correctly
 */
describe("Jest Setup", () => {
  it("should be able to run tests", () => {
    expect(true).toBe(true);
  });

  it("should have access to Jest DOM matchers", () => {
    const element = document.createElement("div");
    element.textContent = "Hello World";
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    document.body.removeChild(element);
  });

  it("should have mocked localStorage", () => {
    localStorage.setItem("test", "value");
    expect(localStorage.setItem).toHaveBeenCalledWith("test", "value");
  });

  it("should have mocked matchMedia", () => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    expect(mediaQuery.matches).toBe(false);
  });
});
