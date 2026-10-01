import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deviceId, setDeviceId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");

  const [message, setMessage] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  // ========================================
  // GET IoT DATA
  // ========================================

  const loadData = async () => {
    try {
      const response = await fetch(`${API_URL}/iot-data`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (error) {
      console.error("Error loading IoT data:", error);
      setConnected(false);
    }
  };

  // ========================================
  // CHECK BLOCKCHAIN
  // ========================================

  const checkBlockchain = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain`);
      const result = await response.json();

      setConnected(result.success);
    } catch (error) {
      console.error("Blockchain connection error:", error);
      setConnected(false);
    }
  };

  // ========================================
  // LOAD DATA WHEN PAGE OPENS
  // ========================================

  useEffect(() => {
    loadData();
    checkBlockchain();
  }, []);

  // ========================================
  // STORE IoT DATA
  // ========================================

  const storeIoTData = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setTransactionHash("");

    try {
      const response = await fetch(`${API_URL}/iot-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          temperature,
          humidity,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("IoT data stored successfully!");

        setTransactionHash(result.transactionHash);

        // Clear form
        setDeviceId("");
        setTemperature("");
        setHumidity("");

        // Reload blockchain data
        await loadData();
      } else {
        setMessage(result.message || "Failed to store data");
      }
    } catch (error) {
      console.error("Store IoT data error:", error);
      setMessage("Backend connection failed.");
    }

    setLoading(false);
  };

  // ========================================
  // FORMAT SENSOR VALUES
  // ========================================

  const getTemperature = (item) => {
    return item.decryptedData?.temperature ?? "-";
  };

  const getHumidity = (item) => {
    return item.decryptedData?.humidity ?? "-";
  };

  // ========================================
  // UI
  // ========================================

  return (
    <div className="app">

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="header">
        <h1>🔐 Secure IoT Blockchain Dashboard</h1>

        <p>
          Blockchain-Based Secure IoT Data Sharing System
        </p>
      </header>


      {/* ========================================
          STATUS CARDS
      ======================================== */}

      <section className="stats">

        {/* Blockchain Status */}

        <div className="card">
          <h3>Blockchain</h3>

          <p className={connected ? "success" : "danger"}>
            {connected
              ? "🟢 Connected"
              : "🔴 Disconnected"}
          </p>
        </div>


        {/* Total Records */}

        <div className="card">
          <h3>Total Records</h3>

          <p className="number">
            {data.length}
          </p>
        </div>


        {/* Network */}

        <div className="card">
          <h3>Network</h3>

          <p>
            Hardhat Localhost
          </p>
        </div>

      </section>


      {/* ========================================
          STORE IoT DATA
      ======================================== */}

      <section className="form-section">

        <h2>📡 Store IoT Data</h2>

        <form onSubmit={storeIoTData}>

          {/* Device ID */}

          <div className="form-group">

            <label>
              Device ID
            </label>

            <input
              type="text"
              placeholder="ESP32-02"
              value={deviceId}
              onChange={(e) =>
                setDeviceId(e.target.value)
              }
              required
            />

          </div>


          {/* Temperature */}

          <div className="form-group">

            <label>
              Temperature (°C)
            </label>

            <input
              type="number"
              step="0.1"
              placeholder="30"
              value={temperature}
              onChange={(e) =>
                setTemperature(e.target.value)
              }
              required
            />

          </div>


          {/* Humidity */}

          <div className="form-group">

            <label>
              Humidity (%)
            </label>

            <input
              type="number"
              step="0.1"
              placeholder="70"
              value={humidity}
              onChange={(e) =>
                setHumidity(e.target.value)
              }
              required
            />

          </div>


          {/* Submit Button */}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Storing..."
              : "Store on Blockchain"}
          </button>

        </form>


        {/* Success / Error Message */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}


        {/* Transaction Hash */}

        {transactionHash && (
          <div className="transaction">

            <strong>
              Transaction Hash:
            </strong>

            <p>
              {transactionHash}
            </p>

          </div>
        )}

      </section>


      {/* ========================================
          IoT SENSOR RECORDS
      ======================================== */}

      <section className="table-section">

        <div className="table-header">

          <h2>
            📊 IoT Sensor Records
          </h2>

          <button
            className="refresh"
            onClick={loadData}
          >
            🔄 Refresh
          </button>

        </div>


        {/* No Records */}

        {data.length === 0 ? (

          <p className="no-data">
            No IoT records found.
          </p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>

                  <th>#</th>

                  <th>
                    Device ID
                  </th>

                  <th>
                    Temperature
                  </th>

                  <th>
                    Humidity
                  </th>

                  <th>
                    Timestamp
                  </th>

                  <th>
                    Sender
                  </th>

                </tr>

              </thead>


              <tbody>

                {data.map((item) => (

                  <tr
                    key={item.index}
                  >

                    {/* Record Number */}

                    <td>
                      {item.index + 1}
                    </td>


                    {/* Device ID */}

                    <td>
                      {item.deviceId}
                    </td>


                    {/* Temperature */}

                    <td>
                      {getTemperature(item)} °C
                    </td>


                    {/* Humidity */}

                    <td>
                      {getHumidity(item)} %
                    </td>


                    {/* Timestamp */}

                    <td>
                      {item.timestamp
                        ? new Date(
                            Number(item.timestamp) * 1000
                          ).toLocaleString()
                        : "-"}
                    </td>


                    {/* Sender */}

                    <td className="address">

                      {item.sender}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default App;