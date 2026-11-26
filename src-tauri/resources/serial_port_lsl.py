"""macOS SerialPortLSL GUI utility for BCI Workshop 2026.

Reads byte streams or newline-delimited numeric CSV lines from a selected
serial/USB port and broadcasts them as a Lab Streaming Layer (LSL) outlet.
"""

from __future__ import annotations

import sys
import threading
import time
from typing import Optional

from PyQt6.QtCore import QTimer, Qt
from PyQt6.QtWidgets import (
    QApplication,
    QComboBox,
    QDoubleSpinBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)
import pylsl
import serial
import serial.tools.list_ports


COMMON_BAUD_RATES = [
    "9600",
    "19200",
    "38400",
    "57600",
    "115200",
    "230400",
    "250000",
    "500000",
]


def list_prioritized_ports() -> list[tuple[str, str]]:
    """Return (device, display_label) tuples sorted with USB/Arduino ports first."""
    priority_tokens = ("usbserial", "usbmodem", "ch340", "ch341", "ftdi", "arduino", "cu.")
    ports = list(serial.tools.list_ports.comports())

    def sort_key(p: object) -> tuple[int, str]:
        dev = getattr(p, "device", "") or ""
        desc = getattr(p, "description", "") or ""
        text = f"{dev} {desc}".lower()
        is_preferred = 0 if any(tok in text for tok in priority_tokens) else 1
        return (is_preferred, dev.lower())

    ports.sort(key=sort_key)
    out: list[tuple[str, str]] = []
    for p in ports:
        label = f"{p.device} — {p.description}" if p.description else p.device
        out.append((p.device, label))
    return out


class SerialPortLslWindow(QMainWindow):
    """Lightweight PyQt6 serial-to-LSL streamer matching App-SerialPort workflow."""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("SerialPortLSL — BCI Workshop 2026")
        self.setMinimumWidth(460)

        self._stop_event = threading.Event()
        self._worker: Optional[threading.Thread] = None
        self._serial_conn: Optional[serial.Serial] = None
        self._outlet: Optional[pylsl.StreamOutlet] = None
        self._samples_sent = 0
        self._chunks_sent = 0
        self._last_error: Optional[str] = None
        self._stats_lock = threading.Lock()

        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(16, 16, 16, 16)
        root_layout.setSpacing(12)

        # Port & Serial Settings
        serial_group = QGroupBox("Serial Connection")
        serial_form = QFormLayout(serial_group)

        port_row = QHBoxLayout()
        self.port_combo = QComboBox()
        self.refresh_btn = QPushButton("Refresh")
        self.refresh_btn.clicked.connect(self.refresh_ports)
        port_row.addWidget(self.port_combo, stretch=1)
        port_row.addWidget(self.refresh_btn)
        serial_form.addRow("Serial Port:", port_row)

        self.baud_combo = QComboBox()
        self.baud_combo.setEditable(True)
        self.baud_combo.addItems(COMMON_BAUD_RATES)
        self.baud_combo.setCurrentText("115200")
        serial_form.addRow("Baud Rate:", self.baud_combo)

        self.mode_combo = QComboBox()
        self.mode_combo.addItems([
            "Raw Bytes (App-SerialPort compatible)",
            "Numeric Lines (CSV -> float32)",
        ])
        serial_form.addRow("Stream Mode:", self.mode_combo)
        root_layout.addWidget(serial_group)

        # LSL Stream Settings
        lsl_group = QGroupBox("LSL Stream Settings")
        lsl_form = QFormLayout(lsl_group)

        self.stream_name_edit = QLineEdit("SerialPort")
        lsl_form.addRow("Stream Name:", self.stream_name_edit)

        self.stream_type_edit = QLineEdit("Raw")
        lsl_form.addRow("Stream Type:", self.stream_type_edit)

        self.srate_spin = QDoubleSpinBox()
        self.srate_spin.setRange(0.0, 100000.0)
        self.srate_spin.setDecimals(1)
        self.srate_spin.setValue(0.0)
        self.srate_spin.setToolTip("0 = irregular / unknown sampling rate")
        lsl_form.addRow("Sampling Rate (Hz):", self.srate_spin)

        self.chunk_spin = QSpinBox()
        self.chunk_spin.setRange(1, 4096)
        self.chunk_spin.setValue(32)
        lsl_form.addRow("Chunk Size:", self.chunk_spin)
        root_layout.addWidget(lsl_group)

        # Action & Status
        self.status_label = QLabel("Idle — select a serial port and click Link.")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("padding: 6px; color: #334155; font-weight: 600;")
        root_layout.addWidget(self.status_label)

        self.link_btn = QPushButton("Link")
        self.link_btn.setMinimumHeight(38)
        self.link_btn.clicked.connect(self.toggle_link)
        root_layout.addWidget(self.link_btn)

        self._ui_timer = QTimer(self)
        self._ui_timer.setInterval(250)
        self._ui_timer.timeout.connect(self._poll_worker_state)

        self.refresh_ports()

    def refresh_ports(self) -> None:
        current_dev = self.port_combo.currentData()
        self.port_combo.clear()
        for dev, label in list_prioritized_ports():
            self.port_combo.addItem(label, dev)
        if current_dev:
            idx = self.port_combo.findData(current_dev)
            if idx >= 0:
                self.port_combo.setCurrentIndex(idx)

    def _set_controls_enabled(self, enabled: bool) -> None:
        for widget in (
            self.port_combo,
            self.refresh_btn,
            self.baud_combo,
            self.mode_combo,
            self.stream_name_edit,
            self.stream_type_edit,
            self.srate_spin,
            self.chunk_spin,
        ):
            widget.setEnabled(enabled)

    def toggle_link(self) -> None:
        if self._worker and self._worker.is_alive():
            self.stop_streaming()
        else:
            self.start_streaming()

    def start_streaming(self) -> None:
        dev = self.port_combo.currentData()
        if not dev:
            QMessageBox.warning(
                self,
                "No Serial Port",
                "No serial port selected. Connect your device and click Refresh.",
            )
            return

        try:
            baud = int(self.baud_combo.currentText().strip())
        except ValueError:
            QMessageBox.warning(self, "Invalid Baud Rate", "Enter a valid integer baud rate.")
            return

        stream_name = self.stream_name_edit.text().strip() or "SerialPort"
        stream_type = self.stream_type_edit.text().strip() or "Raw"
        srate = float(self.srate_spin.value())
        chunk_size = int(self.chunk_spin.value())
        csv_mode = self.mode_combo.currentIndex() == 1

        try:
            ser = serial.Serial(dev, baudrate=baud, timeout=0.2)
        except Exception as exc:
            QMessageBox.critical(
                self,
                "Serial Port Error",
                f"Could not open {dev} at {baud} baud:\n{exc}",
            )
            return

        with self._stats_lock:
            self._samples_sent = 0
            self._chunks_sent = 0
            self._last_error = None

        self._serial_conn = ser
        self._stop_event.clear()
        self._set_controls_enabled(False)
        self.link_btn.setText("Unlink")
        self.status_label.setText(f"Linked to {dev} ({baud} baud) — streaming LSL '{stream_name}'...")
        self.status_label.setStyleSheet("padding: 6px; color: #047857; font-weight: 700;")

        self._worker = threading.Thread(
            target=self._stream_loop,
            args=(ser, stream_name, stream_type, srate, chunk_size, csv_mode, dev),
            daemon=True,
        )
        self._worker.start()
        self._ui_timer.start()

    def _stream_loop(
        self,
        ser: serial.Serial,
        stream_name: str,
        stream_type: str,
        srate: float,
        chunk_size: int,
        csv_mode: bool,
        dev: str,
    ) -> None:
        outlet: Optional[pylsl.StreamOutlet] = None
        try:
            if not csv_mode:
                info = pylsl.StreamInfo(
                    stream_name,
                    stream_type,
                    1,
                    srate,
                    pylsl.cf_int8,
                    f"serialportlsl_{dev}",
                )
                outlet = pylsl.StreamOutlet(info, chunk_size=chunk_size)
                self._outlet = outlet
                while not self._stop_event.is_set():
                    waiting = ser.in_waiting
                    raw = ser.read(max(1, min(waiting or chunk_size, 4096)))
                    if not raw:
                        continue
                    samples = [[b - 256 if b > 127 else b] for b in raw]
                    outlet.push_chunk(samples)
                    with self._stats_lock:
                        self._samples_sent += len(samples)
                        self._chunks_sent += 1
            else:
                while not self._stop_event.is_set():
                    raw_line = ser.readline()
                    if not raw_line:
                        continue
                    text = raw_line.decode("utf-8", errors="ignore").strip()
                    if not text:
                        continue
                    tokens = text.replace(",", " ").split()
                    try:
                        vals = [float(tok) for tok in tokens]
                    except ValueError:
                        continue
                    if not vals:
                        continue
                    if outlet is None:
                        info = pylsl.StreamInfo(
                            stream_name,
                            stream_type,
                            len(vals),
                            srate,
                            pylsl.cf_float32,
                            f"serialportlsl_{dev}",
                        )
                        outlet = pylsl.StreamOutlet(info, chunk_size=1)
                        self._outlet = outlet
                    if len(vals) == outlet.get_info().channel_count():
                        outlet.push_sample(vals)
                        with self._stats_lock:
                            self._samples_sent += 1
                            self._chunks_sent += 1
        except Exception as exc:
            if not self._stop_event.is_set():
                with self._stats_lock:
                    self._last_error = str(exc)
        finally:
            try:
                if ser.is_open:
                    ser.close()
            except Exception:
                pass
            self._outlet = None

    def _poll_worker_state(self) -> None:
        with self._stats_lock:
            err = self._last_error
            samples = self._samples_sent
            chunks = self._chunks_sent

        if err:
            self.stop_streaming()
            QMessageBox.warning(self, "Stream Stopped", f"Serial/LSL error: {err}")
            return

        if self._worker and not self._worker.is_alive():
            self.stop_streaming()
            return

        self.status_label.setText(f"Streaming active — {samples} samples sent ({chunks} packets)")

    def stop_streaming(self) -> None:
        self._ui_timer.stop()
        self._stop_event.set()
        ser = self._serial_conn
        self._serial_conn = None
        if ser is not None:
            try:
                if ser.is_open:
                    ser.close()
            except Exception:
                pass
        if self._worker and self._worker.is_alive():
            self._worker.join(timeout=1.5)
        self._worker = None
        self._outlet = None
        self._set_controls_enabled(True)
        self.link_btn.setText("Link")
        self.status_label.setText("Unlinked — ready.")
        self.status_label.setStyleSheet("padding: 6px; color: #334155; font-weight: 600;")

    def closeEvent(self, event: object) -> None:
        self.stop_streaming()
        time.sleep(0.05)
        super().closeEvent(event)  # type: ignore[arg-type]


def main() -> int:
    app = QApplication(sys.argv)
    win = SerialPortLslWindow()
    win.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
